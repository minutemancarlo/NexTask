import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  UserCheck,
  Edit2,
  Trash2,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { PrioritySelect } from '../task/PrioritySelect';
import { StatusSelect } from '../task/StatusSelect';
import confetti from 'canvas-confetti';

export const ListView = () => {
  const {
    filteredTasks,
    updateTask,
    deleteTask,
    setEditingTask,
    activeTimerTask,
    setActiveTimerTask,
  } = useTasks();

  const [sortBy, setSortBy] = useState('due_date'); // 'due_date' | 'quadrant' | 'title'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'quadrant') {
      comp = a.quadrant.localeCompare(b.quadrant);
    } else if (sortBy === 'title') {
      comp = a.title.localeCompare(b.title);
    } else if (sortBy === 'due_date') {
      const dateA = a.due_date || '9999-99-99';
      const dateB = b.due_date || '9999-99-99';
      comp = dateA.localeCompare(dateB);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleToggleComplete = (task, e) => {
    e.stopPropagation();
    const isCompleted = task.status === 'completed';
    const newStatus = isCompleted ? 'todo' : 'completed';
    updateTask(task.id, { status: newStatus });
    if (!isCompleted) {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
  };

  return (
    <div className="flex-1 px-3.5 sm:px-5 lg:px-6 py-4 w-full">
      <div className="bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 backdrop-blur-sm shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="p-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-950/40 dark:to-slate-900/40">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20 shadow-xs shadow-indigo-500/50 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              All Tasks ({sortedTasks.length})
            </h3>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <button
              onClick={() => toggleSort('quadrant')}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'quadrant'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Quadrant {sortBy === 'quadrant' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('due_date')}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'due_date'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Due Date {sortBy === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">
                <th className="py-3.5 px-4 w-12">Done</th>
                <th className="py-3.5 px-4">Task & Description</th>
                <th className="py-3.5 px-4 w-44">Quadrant (Priority)</th>
                <th className="py-3.5 px-4 w-40">Status</th>
                <th className="py-3.5 px-4 w-36">Due Date</th>
                <th className="py-3.5 px-4 w-40">Delegatee / Project</th>
                <th className="py-3.5 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No tasks found matching current filters
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  const isTimerActive = activeTimerTask?.id === task.id;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setEditingTask(task)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                        isCompleted ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      } ${isTimerActive ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleComplete(task, e)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-slate-800 dark:text-slate-200 text-sm ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {task.title}
                          </span>
                          {task.openproject_id && (
                            <a
                              href={task.openproject_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors"
                              title={`OpenProject Ticket #${task.openproject_id}`}
                            >
                              <span>OP #{task.openproject_id}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 text-xs">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Quadrant (Interactive Priority Dropdown) */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <PrioritySelect taskId={task.id} currentQuadrant={task.quadrant} />
                      </td>

                      {/* Status (Interactive Status Dropdown) */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <StatusSelect taskId={task.id} currentStatus={task.status} />
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {task.due_date ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.due_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-sm">No date</span>
                        )}
                      </td>

                      {/* Delegatee & Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {task.delegatee && (
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm" title={task.openproject_id ? `QA Contact: ${task.delegatee}` : `Delegatee: ${task.delegatee}`}>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">
                                {task.openproject_id ? `QA: ${task.delegatee}` : task.delegatee}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.severity && (
                              <span
                                className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                                title={`Severity: ${task.severity}`}
                              >
                                {task.severity}
                              </span>
                            )}
                            {task.category_name && (
                              <span
                                className="inline-block text-xs font-semibold px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: `${task.category_color}15`,
                                  color: task.category_color,
                                  borderColor: `${task.category_color}40`,
                                }}
                              >
                                {task.category_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Row Action Controls */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {!isCompleted && (
                            <button
                              onClick={() => setActiveTimerTask(isTimerActive ? null : task)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isTimerActive
                                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                                  : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                              }`}
                              title={isTimerActive ? 'Active Focus Task' : 'Focus with Pomodoro'}
                            >
                              <Flame className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this task?')) {
                                deleteTask(task.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
