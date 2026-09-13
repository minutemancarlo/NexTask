const express = require('express');
const router = express.Router();
const db = require('../db');
const { extractTags } = db;

// Helper to attach tags array to notes
function attachTagsToNotes(notes) {
  if (!notes || notes.length === 0) return [];
  const noteIds = notes.map(n => n.id);
  const placeholders = noteIds.map(() => '?').join(',');
  const tagsQuery = db.prepare(`
    SELECT note_id, tag FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY tag ASC
  `);
  const tagRows = tagsQuery.all(...noteIds);

  const tagsByNote = {};
  for (const row of tagRows) {
    if (!tagsByNote[row.note_id]) {
      tagsByNote[row.note_id] = [];
    }
    tagsByNote[row.note_id].push(row.tag);
  }

  return notes.map(note => ({
    ...note,
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    tags: tagsByNote[note.id] || [],
  }));
}

// GET /api/notes - Query notes with filters
router.get('/', (req, res) => {
  try {
    const { filter = 'all', tag, search, date } = req.query;
    let query = `SELECT * FROM notes WHERE 1=1`;
    const params = [];

    // Filter view: 'all' (active only), 'pinned', 'archived'
    if (filter === 'archived') {
      query += ` AND archived = 1`;
    } else if (filter === 'pinned') {
      query += ` AND pinned = 1 AND archived = 0`;
    } else {
      // Default 'all' shows active notes
      query += ` AND archived = 0`;
    }

    // Filter by tag
    if (tag) {
      const normalizedTag = tag.replace(/^#/, '').toLowerCase().trim();
      query += ` AND id IN (SELECT note_id FROM note_tags WHERE LOWER(tag) = ?)`;
      params.push(normalizedTag);
    }

    // Full-text search
    if (search && search.trim()) {
      query += ` AND content LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    // Date filter (YYYY-MM-DD)
    if (date && date.trim()) {
      query += ` AND strftime('%Y-%m-%d', created_at) = ?`;
      params.push(date.trim());
    }

    // Sort: pinned first, then newest first
    query += ` ORDER BY pinned DESC, created_at DESC`;

    const notes = db.prepare(query).all(...params);
    const populatedNotes = attachTagsToNotes(notes);

    res.json(populatedNotes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/tags - Distinct tags with note counts
router.get('/tags', (req, res) => {
  try {
    const query = `
      SELECT t.tag, COUNT(DISTINCT t.note_id) as count
      FROM note_tags t
      JOIN notes n ON t.note_id = n.id
      WHERE n.archived = 0
      GROUP BY t.tag
      ORDER BY count DESC, t.tag ASC
    `;
    const tags = db.prepare(query).all();
    res.json(tags);
  } catch (err) {
    console.error('Error fetching note tags:', err);
    res.status(500).json({ error: 'Failed to fetch note tags' });
  }
});

// GET /api/notes/stats - Daily counts for activity calendar heatmap
router.get('/stats', (req, res) => {
  try {
    const query = `
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
      FROM notes
      WHERE archived = 0
      GROUP BY date
      ORDER BY date ASC
    `;
    const rows = db.prepare(query).all();
    // Return map: { '2026-09-13': 3, ... }
    const stats = {};
    for (const r of rows) {
      if (r.date) stats[r.date] = r.count;
    }
    res.json(stats);
  } catch (err) {
    console.error('Error fetching note stats:', err);
    res.status(500).json({ error: 'Failed to fetch note stats' });
  }
});

// GET /api/notes/export - Export all notes as JSON or Markdown bundle
router.get('/export', (req, res) => {
  try {
    const format = req.query.format || 'markdown';
    const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
    const populated = attachTagsToNotes(notes);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="nextask-notes-${new Date().toISOString().split('T')[0]}.json"`);
      return res.send(JSON.stringify(populated, null, 2));
    }

    // Markdown export
    let md = `# NexTask Notes Export\n*Exported on: ${new Date().toISOString()}*\n*Total Notes: ${populated.length}*\n\n---\n\n`;
    for (const note of populated) {
      const tagsStr = note.tags.length > 0 ? `\nTags: ${note.tags.map(t => '#' + t).join(' ')}` : '';
      const pinStr = note.pinned ? ' (Pinned)' : '';
      const archStr = note.archived ? ' (Archived)' : '';
      md += `### Note [${note.created_at}]${pinStr}${archStr}${tagsStr}\n\n${note.content}\n\n---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nextask-notes-${new Date().toISOString().split('T')[0]}.md"`);
    res.send(md);
  } catch (err) {
    console.error('Error exporting notes:', err);
    res.status(500).json({ error: 'Failed to export notes' });
  }
});

// POST /api/notes - Create new note
router.post('/', (req, res) => {
  try {
    const { content, pinned = 0 } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const id = `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const isPinned = pinned ? 1 : 0;

    const insertNote = db.prepare(`
      INSERT INTO notes (id, content, pinned, archived, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `);
    insertNote.run(id, content.trim(), isPinned, now, now);

    // Extract tags and insert
    const tags = extractTags(content);
    if (tags.length > 0) {
      const insertTag = db.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag, created_at)
        VALUES (?, ?, ?)
      `);
      for (const tag of tags) {
        insertTag.run(id, tag, now);
      }
    }

    const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    const populated = attachTagsToNotes([created])[0];

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update note content
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content, pinned, archived } = req.body;

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedContent = content !== undefined ? content : existing.content;
    const updatedPinned = pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned;
    const updatedArchived = archived !== undefined ? (archived ? 1 : 0) : existing.archived;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE notes
      SET content = ?, pinned = ?, archived = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedContent, updatedPinned, updatedArchived, now, id);

    // Re-index tags if content changed
    if (content !== undefined) {
      db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(id);
      const tags = extractTags(updatedContent);
      if (tags.length > 0) {
        const insertTag = db.prepare(`
          INSERT OR IGNORE INTO note_tags (note_id, tag, created_at)
          VALUES (?, ?, ?)
        `);
        for (const tag of tags) {
          insertTag.run(id, tag, now);
        }
      }
    }

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    const populated = attachTagsToNotes([updated])[0];

    res.json(populated);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// PATCH /api/notes/:id/pin - Toggle pin status
router.patch('/:id/pin', (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const newPinned = note.pinned ? 0 : 1;
    db.prepare('UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?')
      .run(newPinned, new Date().toISOString(), id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(attachTagsToNotes([updated])[0]);
  } catch (err) {
    console.error('Error toggling pin:', err);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// PATCH /api/notes/:id/archive - Toggle archive status
router.patch('/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const newArchived = note.archived ? 0 : 1;
    db.prepare('UPDATE notes SET archived = ?, updated_at = ? WHERE id = ?')
      .run(newArchived, new Date().toISOString(), id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(attachTagsToNotes([updated])[0]);
  } catch (err) {
    console.error('Error toggling archive:', err);
    res.status(500).json({ error: 'Failed to toggle archive' });
  }
});

// DELETE /api/notes/:id - Delete note
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(id);
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
