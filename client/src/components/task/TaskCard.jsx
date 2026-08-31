import React from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  UserCheck,
  Flame,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { PrioritySelect } from './PrioritySelect';
import { StatusSelect } from './StatusSelect';
import confetti from 'canvas-confetti';

const QUADRANT_META = {
  Q1: {
    borderClass: 'hover:border-red-300 dark:hover:border-red-700',
  },
  Q2: {
    borderClass: 'hover:border-amber-300 dark:hover:border-amber-700',
  },
  Q3: {
    borderClass: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  Q4: {
    borderClass: 'hover:border-slate-400 dark:hover:border-slate-600',
  },
};

export const TaskCard = ({ task, isCompact = false }) => {
  const {
    updateTask,
    deleteTask,
    setEditingTask,
    setActiveTimerTask,
    activeTimerTask,
  } = useTasks();

  const isCompleted = task.status === 'completed';
  const isTimerActive = activeTimerTask?.id === task.id;

  // Due date status
  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    const today = new Date().toISOString().split('T')[0];
    if (task.due_date < today) {
      return { label: `Overdue: ${task.due_date}`, class: 'text-red-600 dark:text-red-400 font-semibold' };
    }
    if (task.due_date === today) {
      return { label: 'Due Today', class: 'text-amber-600 dark:text-amber-400 font-semibold' };
    }
    return { label: task.due_date, class: 'text-slate-600 dark:text-slate-300 font-medium' };
  };

  const dueStatus = getDueDateStatus();

  // Completion toggle with confetti burst
  const handleToggleComplete = (e) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'todo' : 'completed';
    updateTask(task.id, { status: newStatus });
    if (!isCompleted) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4f46e5', '#10b981', '#f59e0b'],
      });
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const meta = QUADRANT_META[task.quadrant] || QUADRANT_META.Q1;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => setEditingTask(task)}
      className={`group relative rounded-xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
        isCompleted ? 'opacity-65 bg-slate-50 dark:bg-slate-900/60' : meta.borderClass
      } ${isTimerActive ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
    >
      {/* Top Meta Line: Quick Switchers for Priority & Status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {/* Quick Priority Switcher Dropdown */}
          <PrioritySelect taskId={task.id} currentQuadrant={task.quadrant} isCompact={isCompact} />

          {/* Quick Status Switcher Dropdown */}
          <StatusSelect taskId={task.id} currentStatus={task.status} />

          {task.category_name && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border"
              style={{
                backgroundColor: `${task.category_color}15`,
                color: task.category_color,
                borderColor: `${task.category_color}40`,
              }}
            >
              {task.category_name}
            </span>
          )}

          {task.openproject_id && (
            <a
              href={task.openproject_url || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors"
              title={`OpenProject Ticket #${task.openproject_id}`}
            >
              <span>OP #{task.openproject_id}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {task.severity && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
              title={`Severity: ${task.severity}`}
            >
              {task.severity}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {/* Pomodoro Focus Launcher */}
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

          {/* Edit Button */}
          <button
            onClick={() => setEditingTask(task)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Edit Task"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (window.confirm('Delete this task?')) {
                deleteTask(task.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Task Title & Checkbox */}
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggleComplete}
          className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
          }`}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted && <CheckSquare className="w-3.5 h-3.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <h4
            className={`text-base font-semibold leading-snug break-words ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h4>

          {task.description && !isCompact && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info: Due Date, Delegation, Pomodoro Count */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {dueStatus && (
            <div className={`flex items-center gap-1.5 ${dueStatus.class}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{dueStatus.label}</span>
            </div>
          )}

          {task.delegatee && (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold" title={task.openproject_id ? `QA Contact: ${task.delegatee}` : `Delegatee: ${task.delegatee}`}>
              <UserCheck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">
                {task.openproject_id ? `QA: ${task.delegatee}` : task.delegatee}
              </span>
            </div>
          )}
        </div>

        {/* Pomodoro count pill */}
        {task.pomodoro_count > 0 && (
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-xs" title={`${task.pomodoro_count} focus sessions completed`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{task.pomodoro_count}🍅</span>
          </div>
        )}
      </div>

    </div>
  );
};
