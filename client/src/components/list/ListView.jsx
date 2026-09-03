import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  UserCheck,
  Edit2,
  Trash2,
  Flame,
  ExternalLink,
  User,
  Layers,
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { api } from '../../services/api';
import { PrioritySelect } from '../task/PrioritySelect';
import { StatusSelect } from '../task/StatusSelect';
import { Pagination } from '../common/Pagination';
import confetti from 'canvas-confetti';

const parseDate = (dStr) => {
  if (!dStr) return null;
  const iso = String(dStr).includes('T') ? dStr : String(dStr).replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const isToday = (dStr) => {
  const d = parseDate(dStr);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const formatShortDateTime = (dStr) => {
  const d = parseDate(dStr);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ListView = () => {
  const {
    filteredTasks,
    updateTask,
    deleteTask,
    setEditingTask,
    activeTimerTask,
    setActiveTimerTask,
    confirmAction,
  } = useTasks();

  const [todayOnly, setTodayOnly] = useState(false);
  const [sortBy, setSortBy] = useState('due_date'); // 'due_date' | 'quadrant' | 'title' | 'created_at'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Eligible tasks that were created/synced today OR completed today
  const todayEligibleTasks = useMemo(() => {
    return filteredTasks.filter(
      (task) => isToday(task.created_at) || isToday(task.completed_at)
    );
  }, [filteredTasks]);

  // Tasks based on todayOnly filter checkbox
  const baseTasks = useMemo(() => {
    if (!todayOnly) return filteredTasks;
    return todayEligibleTasks;
  }, [filteredTasks, todayOnly, todayEligibleTasks]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    return [...baseTasks].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'quadrant') {
        comp = a.quadrant.localeCompare(b.quadrant);
      } else if (sortBy === 'title') {
        comp = a.title.localeCompare(b.title);
      } else if (sortBy === 'due_date') {
        const dateA = a.due_date || '9999-99-99';
        const dateB = b.due_date || '9999-99-99';
        comp = dateA.localeCompare(dateB);
      } else if (sortBy === 'created_at') {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        comp = dateA.localeCompare(dateB);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [baseTasks, sortBy, sortOrder]);

  // Adjust current page if out of bounds
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedTasks.length / (Number(pageSize) || 25)));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Paginated slice
  const paginatedTasks = useMemo(() => {
    if (pageSize === 'all') return sortedTasks;
    const size = Number(pageSize) || 25;
    const start = (currentPage - 1) * size;
    return sortedTasks.slice(start, start + size);
  }, [sortedTasks, currentPage, pageSize]);

  // Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      const taskIds = sortedTasks.map((t) => t.id);
      await api.exportTasksExcelReport({ taskIds });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      setExportError(err.message || 'Failed to export Excel report');
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-950/40 dark:to-slate-900/40">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20 shadow-xs shadow-indigo-500/50 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>All Tasks ({sortedTasks.length})</span>
              {todayOnly && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Today's Activity Active
                </span>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end text-xs sm:text-sm">
            {/* Today Filter Checkbox */}
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-bold ${
              todayOnly
                ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}>
              <input
                type="checkbox"
                checked={todayOnly}
                onChange={(e) => {
                  setTodayOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Synced / Completed Today</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                todayOnly
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {todayEligibleTasks.length}
              </span>
            </label>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting || sortedTasks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 text-xs"
              title="Download formatted Excel (.xlsx) report with Cards Dashboard, Created/Sync and Completion Dates"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </>
              )}
            </button>

            <span className="text-slate-400 font-medium text-xs ml-1">Sort:</span>
            <button
              onClick={() => toggleSort('quadrant')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs cursor-pointer ${
                sortBy === 'quadrant'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Quadrant {sortBy === 'quadrant' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('due_date')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs cursor-pointer ${
                sortBy === 'due_date'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Due Date {sortBy === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('created_at')}
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs cursor-pointer ${
                sortBy === 'created_at'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              Sync Date {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Export Success/Error Feedback Alerts */}
        {exportSuccess && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tasks Excel report successfully generated and downloaded!</span>
          </div>
        )}

        {exportError && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span>{exportError}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">
                <th className="py-3.5 px-4 w-12">Done</th>
                <th className="py-3.5 px-4">Task & Description</th>
                <th className="py-3.5 px-4 w-44">Quadrant (Priority)</th>
                <th className="py-3.5 px-4 w-40">Status</th>
                <th className="py-3.5 px-4 w-44">Timeline & Dates</th>
                <th className="py-3.5 px-4 w-40">Delegatee / Project</th>
                <th className="py-3.5 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No tasks found matching current filters
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
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
                          {task.openproject_id ? (
                            <a
                              href={task.openproject_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors shadow-2xs"
                              title={`Synced from OpenProject #${task.openproject_id}`}
                            >
                              <Layers className="w-2.5 h-2.5 text-indigo-500" />
                              <span>OP #{task.openproject_id}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 shadow-2xs"
                              title="User Added Task"
                            >
                              <User className="w-2.5 h-2.5 text-slate-400" />
                              <span>User Added</span>
                            </span>
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

                      {/* Timeline & Dates (Due Date, Created / Sync Date, Completion Date) */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="space-y-1">
                          {task.due_date ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200" title="Due Date">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Due: {task.due_date}</span>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic text-xs">No due date</div>
                          )}

                          {task.created_at && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1" title="Created / Synced Date">
                              <Clock className="w-3 h-3 text-slate-400/80 shrink-0" />
                              <span>Sync: {formatShortDateTime(task.created_at)}</span>
                            </div>
                          )}

                          {task.completed_at && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1" title="Completion Date">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>Done: {formatShortDateTime(task.completed_at)}</span>
                            </div>
                          )}
                        </div>
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
                              confirmAction({
                                title: 'Delete Task',
                                message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
                                confirmText: 'Delete Task',
                                variant: 'danger',
                                onConfirm: () => deleteTask(task.id),
                              });
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

        {/* Bottom Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={sortedTasks.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="tasks"
        />
      </div>
    </div>
  );
};
