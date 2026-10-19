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

// Helper to parse notes from exported Markdown
function parseMarkdownNotes(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return [];

  // Split on --- separator (handling CRLF or LF)
  const sections = markdownText.split(/(?:\r?\n|^)---(?:\r?\n|$)/);
  const notes = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    // Skip export title header block if present
    if (trimmed.startsWith('# NexTask Notes Export')) continue;

    // Check if section contains a note header: ### Note [timestamp] (Pinned) (Archived)
    const headerMatch = trimmed.match(/^### Note(?:\s+\[([^\]]+)\])?([^\n]*)/i);
    let content = trimmed;
    let createdAt = new Date().toISOString();
    let pinned = false;
    let archived = false;

    if (headerMatch) {
      if (headerMatch[1]) {
        const parsedDate = new Date(headerMatch[1].trim());
        if (!isNaN(parsedDate.getTime())) {
          createdAt = parsedDate.toISOString();
        }
      }
      const flags = (headerMatch[2] || '').toLowerCase();
      if (flags.includes('pinned')) pinned = true;
      if (flags.includes('archived')) archived = true;

      // Remove the header line
      content = trimmed.slice(headerMatch[0].length).trim();
    }

    // Look for and strip out "Tags: #tag1 #tag2..." line if present right below header
    const tagsMatch = content.match(/^Tags:\s*([^\n]+)/i);
    if (tagsMatch) {
      content = content.slice(tagsMatch[0].length).trim();
    }

    if (content.length > 0) {
      notes.push({
        id: `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${notes.length}`,
        content,
        pinned,
        archived,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  }

  // If no sections were separated by ---, but text exists, treat the entire markdown as a single note
  if (notes.length === 0 && markdownText.trim().length > 0 && !markdownText.trim().startsWith('# NexTask Notes Export')) {
    notes.push({
      id: `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      content: markdownText.trim(),
      pinned: false,
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return notes;
}

// Helper to extract an array of note candidate objects from diverse payload shapes
function extractNotesFromPayload(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.notes)) return body.notes;
  if (typeof body.markdown === 'string') {
    return parseMarkdownNotes(body.markdown);
  }
  if (body.format === 'markdown' && typeof body.content === 'string') {
    return parseMarkdownNotes(body.content);
  }
  // Single note object with content
  if (body.content && typeof body.content === 'string') {
    return [body];
  }
  return [];
}

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

// POST /api/notes/import - Import backed up notes from JSON or Markdown
router.post('/import', (req, res) => {
  try {
    const mode = req.body && req.body.mode === 'replace' ? 'replace' : 'merge';
    const rawNotes = extractNotesFromPayload(req.body);

    if (!Array.isArray(rawNotes) || rawNotes.length === 0) {
      return res.status(400).json({ error: 'No valid notes found to import' });
    }

    const validNotes = [];
    for (let i = 0; i < rawNotes.length; i++) {
      const n = rawNotes[i];
      if (!n || typeof n.content !== 'string' || !n.content.trim()) {
        continue;
      }

      const noteId = (n.id && String(n.id).trim()) || `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
      const pinned = n.pinned ? 1 : 0;
      const archived = n.archived ? 1 : 0;
      const now = new Date().toISOString();
      let createdAt = now;
      if (n.created_at) {
        const d = new Date(n.created_at);
        if (!isNaN(d.getTime())) createdAt = d.toISOString();
      }
      let updatedAt = createdAt;
      if (n.updated_at) {
        const d = new Date(n.updated_at);
        if (!isNaN(d.getTime())) updatedAt = d.toISOString();
      }

      // Collect tags from content and from explicit tags array
      const tagsSet = new Set(extractTags(n.content));
      if (Array.isArray(n.tags)) {
        for (const t of n.tags) {
          if (typeof t === 'string' && t.trim()) {
            tagsSet.add(t.replace(/^#/, '').toLowerCase().trim());
          }
        }
      }

      validNotes.push({
        id: noteId,
        content: n.content.trim(),
        pinned,
        archived,
        created_at: createdAt,
        updated_at: updatedAt,
        tags: Array.from(tagsSet),
      });
    }

    if (validNotes.length === 0) {
      return res.status(400).json({ error: 'No valid notes with content found to import' });
    }

    db.exec('BEGIN');
    try {
      if (mode === 'replace') {
        db.prepare('DELETE FROM note_tags').run();
        db.prepare('DELETE FROM notes').run();
      }

      const upsertNote = db.prepare(`
        INSERT INTO notes (id, content, pinned, archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          pinned = excluded.pinned,
          archived = excluded.archived,
          updated_at = excluded.updated_at
      `);

      const deleteNoteTags = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
      const insertTag = db.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag, created_at)
        VALUES (?, ?, ?)
      `);

      for (const note of validNotes) {
        upsertNote.run(
          note.id,
          note.content,
          note.pinned,
          note.archived,
          note.created_at,
          note.updated_at
        );

        deleteNoteTags.run(note.id);
        for (const tag of note.tags) {
          insertTag.run(note.id, tag, note.created_at);
        }
      }

      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      mode,
      importedCount: validNotes.length,
      message: `Successfully imported ${validNotes.length} note${validNotes.length === 1 ? '' : 's'} (${mode} mode).`,
    });
  } catch (err) {
    console.error('Error importing notes:', err);
    res.status(500).json({ error: 'Failed to import notes: ' + err.message });
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

router.parseMarkdownNotes = parseMarkdownNotes;
router.extractNotesFromPayload = extractNotesFromPayload;

module.exports = router;

