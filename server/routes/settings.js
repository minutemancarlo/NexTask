const express = require('express');
const router = express.Router();
const db = require('../db');

// GET settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    });

    // Defaults
    if (!settings.pomodoro_work) settings.pomodoro_work = 25;
    if (!settings.pomodoro_break) settings.pomodoro_break = 5;
    if (!settings.theme) settings.theme = 'dark';

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST update settings
router.post('/', (req, res) => {
  try {
    const newSettings = req.body;
    const upsert = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `);

    db.exec('BEGIN');
    try {
      for (const [k, v] of Object.entries(newSettings)) {
        upsert.run(k, JSON.stringify(v));
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET export all data as JSON
router.get('/export', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks').all();
    const subtasks = db.prepare('SELECT * FROM subtasks').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    const notes = db.prepare('SELECT * FROM notes').all();
    const note_tags = db.prepare('SELECT * FROM note_tags').all();

    res.json({
      version: '1.0',
      exported_at: new Date().toISOString(),
      tasks,
      subtasks,
      categories,
      settings,
      notes,
      note_tags,
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST import data from JSON
router.post('/import', (req, res) => {
  try {
    const { tasks, subtasks, categories, settings, notes } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid backup file format: tasks array missing' });
    }

    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM subtasks').run();
      db.prepare('DELETE FROM tasks').run();
      if (categories && Array.isArray(categories)) {
        db.prepare('DELETE FROM categories').run();
        const insertCat = db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)');
        categories.forEach(c => insertCat.run(c.id, c.name, c.color));
      }

      const insertTask = db.prepare(`
        INSERT INTO tasks (id, title, description, quadrant, status, due_date, category_id, delegatee, pomodoro_count, created_at, updated_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      tasks.forEach(t => {
        insertTask.run(
          t.id,
          t.title,
          t.description || '',
          t.quadrant,
          t.status || 'todo',
          t.due_date || null,
          t.category_id || null,
          t.delegatee || null,
          t.pomodoro_count || 0,
          t.created_at || new Date().toISOString(),
          t.updated_at || new Date().toISOString(),
          t.completed_at || null
        );
      });

      if (subtasks && Array.isArray(subtasks)) {
        const insertSub = db.prepare(`
          INSERT INTO subtasks (id, task_id, title, is_completed, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `);
        subtasks.forEach(s => {
          insertSub.run(s.id, s.task_id, s.title, s.is_completed ? 1 : 0, s.sort_order || 0);
        });
      }

      // Restore notes if provided in backup
      if (notes && Array.isArray(notes)) {
        db.prepare('DELETE FROM note_tags').run();
        db.prepare('DELETE FROM notes').run();

        const insertNote = db.prepare(`
          INSERT INTO notes (id, content, pinned, archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insertTag = db.prepare(`
          INSERT OR IGNORE INTO note_tags (note_id, tag, created_at)
          VALUES (?, ?, ?)
        `);

        notes.forEach((n, idx) => {
          if (!n || typeof n.content !== 'string' || !n.content.trim()) return;
          const noteId = (n.id && String(n.id).trim()) || `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`;
          const createdAt = n.created_at || new Date().toISOString();
          const updatedAt = n.updated_at || createdAt;

          insertNote.run(
            noteId,
            n.content.trim(),
            n.pinned ? 1 : 0,
            n.archived ? 1 : 0,
            createdAt,
            updatedAt
          );

          const tags = Array.isArray(n.tags) && n.tags.length > 0
            ? n.tags
            : (db.extractTags ? db.extractTags(n.content) : []);
          tags.forEach(t => {
            const cleanTag = typeof t === 'string' ? t.replace(/^#/, '').toLowerCase().trim() : '';
            if (cleanTag) insertTag.run(noteId, cleanTag, createdAt);
          });
        });
      }

      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data: ' + error.message });
  }
});

// POST purge all tasks and imported categories (DANGER ZONE)
// Strictly preserves configuration and settings
router.post('/purge', (req, res) => {
  try {
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM subtasks').run();
      db.prepare('DELETE FROM tasks').run();
      // Purge imported OpenProject tags, leave core categories
      db.prepare("DELETE FROM categories WHERE id LIKE 'op-%'").run();
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      message: 'NexTask tasks purged successfully. Configurations and credentials preserved.'
    });
  } catch (error) {
    console.error('Error purging tasks:', error);
    res.status(500).json({ error: 'Failed to purge data: ' + error.message });
  }
});

module.exports = router;
