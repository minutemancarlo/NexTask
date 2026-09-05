import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck, Tag, Clock, User, Layers, ExternalLink } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

const QUADRANTS = [
  {
    id: 'Q1',
    name: 'Do First',
    subtitle: 'Urgent & Important',
    color: 'border-red-500 text-red-600 dark:text-red-400',
    activeBg: 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20',
  },
  {
    id: 'Q2',
    name: 'Schedule',
    subtitle: 'Important, Not Urgent',
    color: 'border-amber-500 text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20',
  },
  {
    id: 'Q3',
    name: 'Delegate',
    subtitle: 'Urgent, Not Important',
    color: 'border-blue-500 text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20',
  },
  {
    id: 'Q4',
    name: 'Eliminate',
    subtitle: 'Not Urgent, Not Important',
    color: 'border-slate-500 text-slate-600 dark:text-slate-400',
    activeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-500 ring-2 ring-slate-500/20',
  },
];

export const TaskModal = () => {
  const {
    editingTask,
    setEditingTask,
    defaultQuadrantForNew,
    createTask,
    updateTask,
    deleteTask,
    categories,
    confirmAction,
  } = useTasks();

  const isNew = editingTask === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState('Q1');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [delegatee, setDelegatee] = useState('');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Sync form when editingTask changes
  useEffect(() => {
    if (editingTask && editingTask !== 'new') {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setQuadrant(editingTask.quadrant || 'Q1');
      setStatus(editingTask.status || 'todo');
      setDueDate(editingTask.due_date || '');
      setCategoryId(editingTask.category_id || '');
      setDelegatee(editingTask.delegatee || '');
      setPomodoroCount(editingTask.pomodoro_count || 0);
    } else if (editingTask === 'new') {
      setTitle('');
      setDescription('');
      setQuadrant(defaultQuadrantForNew || 'Q1');
      setStatus('todo');
      setDueDate('');
      setCategoryId('');
      setDelegatee('');
      setPomodoroCount(0);
    }
  }, [editingTask, defaultQuadrantForNew]);

  if (!editingTask) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      quadrant,
      status,
      due_date: dueDate || null,
      category_id: categoryId || null,
      delegatee: delegatee.trim() ? delegatee.trim() : null,
      pomodoro_count: pomodoroCount,
    };

    if (isNew) {
      await createTask(payload);
    } else {
      await updateTask(editingTask.id, payload);
    }
    setEditingTask(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isNew ? 'Create New Task' : 'Edit Task'}
            </h3>
            {!isNew && (
              editingTask?.openproject_id ? (
                <a
                  href={editingTask.openproject_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
                  title="Synced from OpenProject"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>OpenProject #{editingTask.openproject_id}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-xs font-bold shadow-2xs"
                  title="User Added Task"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>User Added</span>
                </span>
              )
            )}
          </div>
          <button
            onClick={() => setEditingTask(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Finalize financial audit report..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>

          {/* Quadrant Picker (The Core Eisenhower Selector) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Eisenhower Quadrant Priority
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {QUADRANTS.map((q) => {
                const isSelected = quadrant === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuadrant(q.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? q.activeBg
                        : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${q.color}`}>{q.id}: {q.name}</span>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {q.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Additional details, scope, or reference links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Due Date & Project Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Tag className="w-4 h-4 text-slate-400" />
                Project / Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">No Project</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delegation field */}
          <div className={quadrant === 'Q3' ? 'p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50' : ''}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Delegate / QA Contact</span>
                {quadrant === 'Q3' && <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">(Q3 Assignee)</span>}
              </label>
              {editingTask?.openproject_id && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
                  OpenProject #{editingTask.openproject_id}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. Elena Rostova (QA), Alex (Ops), external vendor..."
              value={delegatee}
              onChange={(e) => setDelegatee(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          {/* Status & Focus Sessions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Progress Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="delegated">Delegated / Waiting</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Pomodoro Sessions
              </label>
              <input
                type="number"
                min="0"
                value={pomodoroCount}
                onChange={(e) => setPomodoroCount(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {!isNew ? (
            <button
              type="button"
              onClick={() => {
                confirmAction({
                  title: 'Delete Task',
                  message: `Are you sure you want to delete "${editingTask?.title || 'this task'}"? This action cannot be undone.`,
                  confirmText: 'Delete Task',
                  variant: 'danger',
                  onConfirm: () => {
                    deleteTask(editingTask.id);
                    setEditingTask(null);
                  },
                });
              }}
              className="text-sm font-semibold text-red-600 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              Delete Task
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-4.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isNew ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
