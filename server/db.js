const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tasks.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    quadrant TEXT NOT NULL CHECK(quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')),
    status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'delegated', 'completed')) DEFAULT 'todo',
    due_date TEXT DEFAULT NULL,
    category_id TEXT DEFAULT NULL,
    delegatee TEXT DEFAULT NULL,
    pomodoro_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migrations: Check and add OpenProject columns if not present
try {
  const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
  const columnNames = tableInfo.map(c => c.name);

  if (!columnNames.includes('openproject_id')) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN openproject_id INTEGER;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_openproject_id ON tasks(openproject_id);
    `);
  }

  if (!columnNames.includes('openproject_url')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN openproject_url TEXT;`);
  }

  if (!columnNames.includes('severity')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN severity TEXT;`);
  }

  if (!columnNames.includes('openproject_assignee')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN openproject_assignee TEXT;`);
  }

  if (!columnNames.includes('openproject_assignee_id')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN openproject_assignee_id TEXT;`);
  }
} catch (migErr) {
  console.error('Migration error for openproject columns:', migErr);
}

// Insert default categories if none exist
const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get().count;
if (categoryCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)');
  insertCat.run('work', 'Work', '#3B82F6');       // Blue
  insertCat.run('personal', 'Personal', '#10B981'); // Emerald
  insertCat.run('urgent', 'Urgent', '#EF4444');   // Red
  insertCat.run('study', 'Learning', '#8B5CF6');  // Purple
}

// Insert default sample tasks if empty
const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get().count;
if (taskCount === 0) {
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, description, quadrant, status, due_date, category_id, delegatee, pomodoro_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSub = db.prepare(`
    INSERT INTO subtasks (id, task_id, title, is_completed, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Sample Q1: Do First
  insertTask.run(
    'task-1',
    'Submit Q3 Financial Report to Leadership',
    'Finalize revenue reconciliations and review variance analysis with controller.',
    'Q1',
    'in_progress',
    new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    'work',
    null,
    2
  );
  insertSub.run('sub-1', 'task-1', 'Export ledger discrepancies', 1, 0);
  insertSub.run('sub-2', 'task-1', 'Verify tax adjustments', 1, 1);
  insertSub.run('sub-3', 'task-1', 'Draft executive summary slides', 0, 2);

  // Sample Q2: Schedule (Long-term strategic)
  insertTask.run(
    'task-2',
    'Architect Cloud Infrastructure Upgrade',
    'Plan migration to multi-region Kubernetes clusters to reduce latency and enhance failover resilience.',
    'Q2',
    'todo',
    new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    'work',
    null,
    1
  );
  insertSub.run('sub-4', 'task-2', 'Benchmark current throughput limits', 1, 0);
  insertSub.run('sub-5', 'task-2', 'Review cost estimates with DevOps lead', 0, 1);

  // Sample Q3: Delegate (Urgent, not important)
  insertTask.run(
    'task-3',
    'Coordinate Vendor Catering for Team Offsite',
    'Collect dietary restrictions and finalize menu contract with vendor by 3 PM.',
    'Q3',
    'delegated',
    new Date().toISOString().split('T')[0], // Today
    'personal',
    'Sarah (Office Operations)',
    0
  );
  insertSub.run('sub-6', 'task-3', 'Send headcount confirmation email', 1, 0);
  insertSub.run('sub-7', 'task-3', 'Request revised invoice', 0, 1);

  // Sample Q4: Eliminate / Low Priority
  insertTask.run(
    'task-4',
    'Organize Archived Slack Channels & Bookmarks',
    'Clean up unused channels and reorganize browser bookmark folders.',
    'Q4',
    'todo',
    null,
    'personal',
    null,
    0
  );
}

module.exports = db;
