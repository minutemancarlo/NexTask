const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const notesRouter = require('../routes/notes');
const settingsRouter = require('../routes/settings');
const db = require('../db');


describe('Notes Backup Import Feature', () => {
  let app;
  let server;
  let baseUrl;
  let initialNotes;
  let initialNoteTags;

  before(async () => {
    // Snapshot state
    initialNotes = db.prepare('SELECT * FROM notes').all();
    initialNoteTags = db.prepare('SELECT * FROM note_tags').all();

    app = express();
    app.use(express.json());
    app.use('/api/notes', notesRouter);
    app.use('/api/settings', settingsRouter);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // Restore state
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM note_tags').run();
      db.prepare('DELETE FROM notes').run();

      const insertNote = db.prepare(`
        INSERT INTO notes (id, content, pinned, archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertTag = db.prepare(`
        INSERT INTO note_tags (id, note_id, tag, created_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const n of initialNotes) {
        insertNote.run(n.id, n.content, n.pinned, n.archived, n.created_at, n.updated_at);
      }
      for (const t of initialNoteTags) {
        insertTag.run(t.id, t.note_id, t.tag, t.created_at);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      console.error('Failed to restore test state:', e);
    }
  });

  describe('Markdown Parser & Payload Extractor Helpers', () => {
    test('parseMarkdownNotes should parse NexTask export markdown bundle', () => {
      const sampleExportMd = `# NexTask Notes Export
*Exported on: 2026-09-13T22:43:16.000Z*
*Total Notes: 2*

---

### Note [2026-09-13T10:00:00.000Z] (Pinned)
Tags: #architecture #ideas

This is note 1 with some code:
\`\`\`js
console.log('hello');
\`\`\`

---

### Note [2026-09-12T14:30:00.000Z] (Archived)
Tags: #meeting

Meeting notes discussing release v1.0.

---
`;

      const parsed = notesRouter.parseMarkdownNotes(sampleExportMd);
      assert.equal(parsed.length, 2);

      assert.equal(parsed[0].pinned, true);
      assert.equal(parsed[0].archived, false);
      assert.match(parsed[0].content, /This is note 1/);
      assert.match(parsed[0].content, /console\.log\('hello'\)/);

      assert.equal(parsed[1].pinned, false);
      assert.equal(parsed[1].archived, true);
      assert.match(parsed[1].content, /Meeting notes discussing release/);
    });

    test('parseMarkdownNotes should parse single note markdown without separators', () => {
      const singleMd = 'Quick thought for today: #productivity and #deepwork.';
      const parsed = notesRouter.parseMarkdownNotes(singleMd);
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].content, singleMd);
      assert.equal(parsed[0].pinned, false);
      assert.equal(parsed[0].archived, false);
    });

    test('extractNotesFromPayload should extract from various payload shapes', () => {
      // 1. Direct array
      const arr = [{ id: 'm1', content: 'note 1' }];
      assert.deepEqual(notesRouter.extractNotesFromPayload(arr), arr);

      // 2. Wrapped in { notes: [...] }
      assert.deepEqual(notesRouter.extractNotesFromPayload({ notes: arr }), arr);

      // 3. Single object with content
      const single = { content: 'hello #world' };
      assert.deepEqual(notesRouter.extractNotesFromPayload(single), [single]);

      // 4. Markdown field
      const mdObj = { markdown: '### Note\n\nContent here' };
      const fromMd = notesRouter.extractNotesFromPayload(mdObj);
      assert.equal(fromMd.length, 1);
      assert.equal(fromMd[0].content, 'Content here');

      // 5. Invalid / empty
      assert.deepEqual(notesRouter.extractNotesFromPayload({}), []);
      assert.deepEqual(notesRouter.extractNotesFromPayload(null), []);
    });
  });

  describe('POST /api/notes/import Endpoint', () => {
    test('should reject requests with no notes or invalid content', async () => {
      const res = await fetch(`${baseUrl}/api/notes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: [] }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.error, /No valid notes found/i);
    });

    test('should import notes from JSON in merge mode', async () => {
      const testNotes = [
        {
          id: 'test-memo-1',
          content: 'Imported test memo 1 with #testing and #json.',
          pinned: true,
          archived: false,
          created_at: '2026-09-01T12:00:00.000Z',
        },
        {
          id: 'test-memo-2',
          content: 'Imported test memo 2 with #backup.',
          pinned: false,
          archived: false,
          created_at: '2026-09-02T12:00:00.000Z',
        },
      ];

      const res = await fetch(`${baseUrl}/api/notes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: testNotes, mode: 'merge' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.importedCount, 2);

      // Verify in database
      const row1 = db.prepare('SELECT * FROM notes WHERE id = ?').get('test-memo-1');
      assert.ok(row1);
      assert.equal(row1.content, testNotes[0].content);
      assert.equal(row1.pinned, 1);

      // Verify tags
      const tags1 = db.prepare('SELECT tag FROM note_tags WHERE note_id = ?').all('test-memo-1').map(t => t.tag);
      assert.ok(tags1.includes('testing'));
      assert.ok(tags1.includes('json'));
    });

    test('should update existing note when IDs match in merge mode', async () => {
      const updatedNote = [
        {
          id: 'test-memo-1',
          content: 'Updated content for memo 1 with #updated and #verified.',
          pinned: false,
          archived: true,
        },
      ];

      const res = await fetch(`${baseUrl}/api/notes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNote, mode: 'merge' }),
      });

      assert.equal(res.status, 200);
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get('test-memo-1');
      assert.equal(row.content, updatedNote[0].content);
      assert.equal(row.pinned, 0);
      assert.equal(row.archived, 1);

      const tags = db.prepare('SELECT tag FROM note_tags WHERE note_id = ?').all('test-memo-1').map(t => t.tag);
      assert.ok(tags.includes('updated'));
      assert.ok(tags.includes('verified'));
      assert.ok(!tags.includes('testing')); // Re-indexed tags
    });

    test('should import notes from Markdown export text', async () => {
      const mdPayload = `# NexTask Notes Export
---

### Note [2026-09-10T08:00:00.000Z] (Pinned)
Tags: #markdown

Imported via Markdown test format.

---
`;

      const res = await fetch(`${baseUrl}/api/notes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: mdPayload, mode: 'merge' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.importedCount, 1);

      // Verify note exists in GET /api/notes
      const getRes = await fetch(`${baseUrl}/api/notes?search=Imported%20via%20Markdown`);
      assert.equal(getRes.status, 200);
      const notes = await getRes.json();
      assert.ok(notes.length >= 1);
      assert.equal(notes[0].pinned, true);
    });

    test('should replace all notes when mode is replace', async () => {
      const cleanBackup = [
        {
          id: 'sole-memo-after-replace',
          content: 'This is the only memo remaining after replace mode with #clean.',
          pinned: 1,
          archived: 0,
        },
      ];

      const res = await fetch(`${baseUrl}/api/notes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: cleanBackup, mode: 'replace' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.mode, 'replace');

      const allNotes = db.prepare('SELECT * FROM notes').all();
      assert.equal(allNotes.length, 1);
      assert.equal(allNotes[0].id, 'sole-memo-after-replace');
    });
  });

  describe('Full Settings Backup & Restore with Notes', () => {
    test('settings/export should include notes and settings/import should restore them', async () => {
      // 1. Export settings
      const exportRes = await fetch(`${baseUrl}/api/settings/export`);
      assert.equal(exportRes.status, 200);
      const backupData = await exportRes.json();

      assert.ok(Array.isArray(backupData.tasks));
      assert.ok(Array.isArray(backupData.notes));
      assert.ok(backupData.notes.length >= 1);

      // 2. Modify notes in backup and restore
      backupData.notes = [
        {
          id: 'full-backup-memo-1',
          content: 'Memo restored from full settings backup with #fullbackup.',
          pinned: 1,
          archived: 0,
          created_at: new Date().toISOString(),
        },
      ];

      const importRes = await fetch(`${baseUrl}/api/settings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      });

      assert.equal(importRes.status, 200);
      const importData = await importRes.json();
      assert.equal(importData.success, true);

      // 3. Verify restored note in database
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get('full-backup-memo-1');
      assert.ok(row);
      assert.equal(row.content, backupData.notes[0].content);

      const tags = db.prepare('SELECT tag FROM note_tags WHERE note_id = ?').all('full-backup-memo-1').map(t => t.tag);
      assert.ok(tags.includes('fullbackup'));
    });
  });
});
