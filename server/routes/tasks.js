const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// GET all tasks with their subtasks and category information
router.get('/', (req, res) => {
  try {
    const { quadrant, status, category_id, search } = req.query;

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (quadrant) {
      query += ` AND t.quadrant = ?`;
      params.push(quadrant);
    }
    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }
    if (category_id) {
      query += ` AND t.category_id = ?`;
      params.push(category_id);
    }
    if (search) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ? OR t.delegatee LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tasks = db.prepare(query).all(...params);

    // Attach subtasks to each task
    const getSubtasksStmt = db.prepare(`
      SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC
    `);

    const tasksWithSubtasks = tasks.map(task => {
      const subtasks = getSubtasksStmt.all(task.id);
      return {
        ...task,
        subtasks
      };
    });

    res.json(tasksWithSubtasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task by id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id);
    res.json({ ...task, subtasks });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST create new task
router.post('/', (req, res) => {
  try {
    const {
      title,
      description = '',
      quadrant = 'Q1',
      status = 'todo',
      due_date = null,
      category_id = null,
      delegatee = null,
      subtasks = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const id = 'task-' + crypto.randomUUID();

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, quadrant, status, due_date, category_id, delegatee, pomodoro_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const insertSubtask = db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_completed, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      insertTask.run(id, title.trim(), description.trim(), quadrant, status, due_date || null, category_id || null, delegatee ? delegatee.trim() : null);

      if (Array.isArray(subtasks)) {
        subtasks.forEach((sub, index) => {
          if (sub.title && sub.title.trim()) {
            insertSubtask.run(
              'sub-' + crypto.randomUUID(),
              id,
              sub.title.trim(),
              sub.is_completed ? 1 : 0,
              index
            );
          }
        });
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    // Fetch and return the newly created task
    const createdTask = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    const createdSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id);

    res.status(201).json({ ...createdTask, subtasks: createdSubtasks });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH update task (fields, quadrant, status, pomodoro_count, etc.)
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      title,
      description,
      quadrant,
      status,
      due_date,
      category_id,
      delegatee,
      pomodoro_count,
      subtasks
    } = req.body;

    let completed_at = existing.completed_at;
    if (status !== undefined) {
      if (status === 'completed' && existing.status !== 'completed') {
        completed_at = new Date().toISOString();
      } else if (status !== 'completed') {
        completed_at = null;
      }
    }

    const updatedTitle = title !== undefined ? title.trim() : existing.title;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedQuadrant = quadrant !== undefined ? quadrant : existing.quadrant;
    const updatedStatus = status !== undefined ? status : existing.status;
    const updatedDueDate = due_date !== undefined ? due_date : existing.due_date;
    const updatedCategory = category_id !== undefined ? category_id : existing.category_id;
    const updatedDelegatee = delegatee !== undefined ? (delegatee ? delegatee.trim() : null) : existing.delegatee;
    const updatedPomodoro = pomodoro_count !== undefined ? Number(pomodoro_count) : existing.pomodoro_count;

    const updateTaskStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, quadrant = ?, status = ?, due_date = ?,
          category_id = ?, delegatee = ?, pomodoro_count = ?, completed_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    db.exec('BEGIN');
    try {
      updateTaskStmt.run(
        updatedTitle,
        updatedDesc,
        updatedQuadrant,
        updatedStatus,
        updatedDueDate,
        updatedCategory,
        updatedDelegatee,
        updatedPomodoro,
        completed_at,
        id
      );

      // If subtasks array was provided, update subtasks
      if (Array.isArray(subtasks)) {
        db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
        const insertSub = db.prepare(`
          INSERT INTO subtasks (id, task_id, title, is_completed, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `);
        subtasks.forEach((sub, index) => {
          if (sub.title && sub.title.trim()) {
            insertSub.run(
              sub.id || ('sub-' + crypto.randomUUID()),
              id,
              sub.title.trim(),
              sub.is_completed ? 1 : 0,
              index
            );
          }
        });
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    const updatedTask = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    const currentSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id);

    res.json({ ...updatedTask, subtasks: currentSubtasks });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST toggle a subtask status directly
router.patch('/:taskId/subtasks/:subtaskId/toggle', (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const sub = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(subtaskId, taskId);
    if (!sub) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    const newCompleted = sub.is_completed === 1 ? 0 : 1;
    db.prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(newCompleted, subtaskId);

    const updatedSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(taskId);
    res.json(updatedSubtasks);
  } catch (error) {
    console.error('Error toggling subtask:', error);
    res.status(500).json({ error: 'Failed to toggle subtask' });
  }
});

// DELETE task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
