const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

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
      openproject_assignee,
      openproject_assignee_id,
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
    const updatedOpAssignee = openproject_assignee !== undefined ? openproject_assignee : existing.openproject_assignee;
    const updatedOpAssigneeId = openproject_assignee_id !== undefined ? openproject_assignee_id : existing.openproject_assignee_id;

    const updateTaskStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, quadrant = ?, status = ?, due_date = ?,
          category_id = ?, delegatee = ?, pomodoro_count = ?, openproject_assignee = ?,
          openproject_assignee_id = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
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
        updatedOpAssignee,
        updatedOpAssigneeId,
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

// POST Export tasks report to Excel (.xlsx)
router.post('/export-excel', async (req, res) => {
  try {
    const { quadrant, status, category_id, search, source, taskIds } = req.body || {};

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      query += ` AND t.id IN (${placeholders})`;
      params.push(...taskIds);
    } else {
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
      if (source === 'user') {
        query += ` AND (t.openproject_id IS NULL OR t.openproject_id = '')`;
      } else if (source === 'openproject') {
        query += ` AND (t.openproject_id IS NOT NULL AND t.openproject_id != '')`;
      }
      if (search) {
        query += ` AND (t.title LIKE ? OR t.description LIKE ? OR t.delegatee LIKE ?)`;
        const searchWildcard = `%${search}%`;
        params.push(searchWildcard, searchWildcard, searchWildcard);
      }
    }

    query += ` ORDER BY t.created_at DESC`;
    const tasks = db.prepare(query).all(...params);

    const QUADRANT_LABELS = {
      Q1: 'Q1: Do First (Urgent & Important)',
      Q2: 'Q2: Schedule (Important, Not Urgent)',
      Q3: 'Q3: Delegate (Urgent, Not Important)',
      Q4: 'Q4: Eliminate (Not Urgent, Not Important)',
    };

    const STATUS_LABELS = {
      todo: 'To Do',
      in_progress: 'In Progress',
      delegated: 'Delegated / Waiting',
      completed: 'Completed',
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NexTask Task Manager';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Tasks Report', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'OpenProject ID', key: 'openproject_id', width: 18 },
      { header: 'Title', key: 'title', width: 44 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Quadrant (Priority)', key: 'quadrant', width: 34 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Severity', key: 'severity', width: 16 },
      { header: 'Delegatee / QA', key: 'delegatee', width: 26 },
      { header: 'Due Date', key: 'due_date', width: 16 },
      { header: 'Created / Sync Date', key: 'created_at', width: 22 },
      { header: 'Completion Date', key: 'completed_at', width: 22 },
    ];

    // Header Styling (Dark Indigo with bold white text)
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }, // Indigo-900
    };

    // Center header for No., OpenProject ID, Status, Severity, Due Date, Created / Sync Date, Completion Date
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('B1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('F1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('G1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('I1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('J1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('K1').alignment = { vertical: 'middle', horizontal: 'center' };

    const getQuadrantStyle = (quadrant) => {
      switch (quadrant) {
        case 'Q1':
          return {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }, // Red-100
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF991B1B' } }, // Red-800
          };
        case 'Q2':
          return {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // Amber-100
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF92400E' } }, // Amber-800
          };
        case 'Q3':
          return {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }, // Blue-100
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E40AF' } }, // Blue-800
          };
        case 'Q4':
          return {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, // Slate-100
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } }, // Slate-700
          };
        default:
          return null;
      }
    };

    const getStatusStyle = (status) => {
      const s = String(status || '').toLowerCase().trim();
      if (s.includes('complete') || s.includes('closed') || s.includes('resolved') || s.includes('fixed') || s.includes('done')) {
        return {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }, // Emerald-100
          font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } }, // Emerald-700
        };
      }
      if (s.includes('progress') || s.includes('working') || s.includes('develop')) {
        return {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // Amber-100
          font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB45309' } }, // Amber-700
        };
      }
      if (s.includes('delegat') || s.includes('wait') || s.includes('test') || s.includes('qa') || s.includes('review')) {
        return {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }, // Indigo-100
          font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4338CA' } }, // Indigo-700
        };
      }
      if (s.includes('reject') || s.includes('cancel') || s.includes('invalid') || s.includes('wont')) {
        return {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } }, // Rose-100
          font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFE11D48' } }, // Rose-600
        };
      }
      // To Do / New / Open / default
      return {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }, // Sky-100
        font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0369A1' } }, // Sky-700
      };
    };

    const formatExcelDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const str = String(dateStr).trim();
        const iso = str.includes('T') ? str : str.replace(' ', 'T') + 'Z';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return str;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      } catch (e) {
        return String(dateStr);
      }
    };

    tasks.forEach((t, index) => {
      const rowData = {
        no: index + 1,
        openproject_id: t.openproject_id ? `#${t.openproject_id}` : '-',
        title: t.title || '',
        description: t.description || '',
        quadrant: QUADRANT_LABELS[t.quadrant] || t.quadrant,
        status: STATUS_LABELS[t.status] || t.status,
        severity: t.severity || '-',
        delegatee: t.delegatee || 'None',
        due_date: t.due_date ? String(t.due_date) : '-',
        created_at: formatExcelDate(t.created_at),
        completed_at: formatExcelDate(t.completed_at),
      };

      const row = sheet.addRow(rowData);
      row.alignment = { vertical: 'top', wrapText: true };
      row.font = { name: 'Segoe UI', size: 10 };

      // Alternating row background (for non-colored cells)
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // Slate-50
        };
      }

      // Center align No. (Col A)
      const noCell = row.getCell(1);
      noCell.alignment = { vertical: 'middle', horizontal: 'center' };
      noCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };

      // Center align OpenProject ID (Col B)
      const opIdCell = row.getCell(2);
      opIdCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (t.openproject_id) {
        opIdCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4338CA' } };
      } else {
        opIdCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF94A3B8' } };
      }

      // Colorize Quadrant (Col E)
      const qStyle = getQuadrantStyle(t.quadrant);
      if (qStyle) {
        const qCell = row.getCell(5);
        qCell.fill = qStyle.fill;
        qCell.font = qStyle.font;
        qCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // Colorize & Center Status (Col F)
      const sStyle = getStatusStyle(t.status);
      if (sStyle) {
        const sCell = row.getCell(6);
        sCell.fill = sStyle.fill;
        sCell.font = sStyle.font;
        sCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }

      // Center align Severity (Col G)
      const sevCell = row.getCell(7);
      sevCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (t.severity) {
        const sevLower = String(t.severity).toLowerCase();
        if (sevLower.includes('critical') || sevLower.includes('blocker')) {
          sevCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFE11D48' } };
        } else if (sevLower.includes('major') || sevLower.includes('high')) {
          sevCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } };
        }
      }

      // Center align Due Date (Col I / 9)
      const dueCell = row.getCell(9);
      dueCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Center align Created / Sync Date (Col J / 10)
      const createdCell = row.getCell(10);
      createdCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Center align Completion Date (Col K / 11)
      const compCell = row.getCell(11);
      compCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (t.completed_at) {
        compCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } }; // Emerald-700
      } else {
        compCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF94A3B8' } }; // Slate-400
      }

      // Add light borders
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const filename = `nextask-tasks-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Tasks Excel report:', error);
    res.status(500).json({ error: `Tasks Excel report export failed: ${error.message}` });
  }
});

module.exports = router;
