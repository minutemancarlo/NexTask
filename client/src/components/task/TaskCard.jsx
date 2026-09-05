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
  User,
  Layers,
  AlertCircle,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { PrioritySelect } from './PrioritySelect';
import { StatusSelect } from './StatusSelect';
import confetti from 'canvas-confetti';

const QUADRANT_THEMES = {
  Q1: {
    accentBorder: 'border-l-[5px] border-l-rose-500',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700/80',
    dotBg: 'bg-rose-500',
    glow: 'hover:shadow-rose-500/5',
    subtleBg: 'hover:bg-rose-50/15 dark:hover:bg-rose-950/20',
  },
  Q2: {
    accentBorder: 'border-l-[5px] border-l-amber-500',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700/80',
    dotBg: 'bg-amber-500',
    glow: 'hover:shadow-amber-500/5',
    subtleBg: 'hover:bg-amber-50/15 dark:hover:bg-amber-950/20',
  },
  Q3: {
    accentBorder: 'border-l-[5px] border-l-blue-500',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700/80',
    dotBg: 'bg-blue-500',
    glow: 'hover:shadow-blue-500/5',
    subtleBg: 'hover:bg-blue-50/15 dark:hover:bg-blue-950/20',
  },
  Q4: {
    accentBorder: 'border-l-[5px] border-l-slate-400 dark:border-l-slate-500',
    hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-700',
    dotBg: 'bg-slate-400',
    glow: 'hover:shadow-slate-500/5',
    subtleBg: 'hover:bg-slate-50/30 dark:hover:bg-slate-700/20',
  },
};

const getSeverityBadge = (severity) => {
  if (!severity) return null;
  const s = String(severity).toLowerCase();
  if (s.includes('critical') || s.includes('blocker')) {
    return {
      label: severity,
      className: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 font-bold',
      icon: <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />,
    };
  }
  if (s.includes('major') || s.includes('high')) {
    return {
      label: severity,
      className: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 font-bold',
      icon: <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />,
    };
  }
  if (s.includes('minor') || s.includes('low')) {
    return {
      label: severity,
      className: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600/50 font-medium',
      icon: null,
    };
  }
  return {
    label: severity,
    className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50 font-medium',
    icon: null,
  };
};

export const TaskCard = ({ task, isCompact = false }) => {
  const {
    updateTask,
    deleteTask,
    setEditingTask,
    setActiveTimerTask,
    activeTimerTask,
    confirmAction,
  } = useTasks();

  const isCompleted = task.status === 'completed';
  const isTimerActive = activeTimerTask?.id === task.id;

  // Due date status calculation
  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    const today = new Date().toISOString().split('T')[0];
    if (task.due_date < today) {
      return {
        label: `Overdue: ${task.due_date}`,
        isOverdue: true,
        className: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 font-bold',
      };
    }
    if (task.due_date === today) {
      return {
        label: 'Due Today',
        isToday: true,
        className: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 font-bold',
      };
    }
    return {
      label: task.due_date,
      className: 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-600/50 font-semibold',
    };
  };

  const dueStatus = getDueDateStatus();
  const severityBadge = getSeverityBadge(task.severity);

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
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'],
      });
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const theme = QUADRANT_THEMES[task.quadrant] || QUADRANT_THEMES.Q1;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => setEditingTask(task)}
      className={`group relative rounded-xl p-3.5 sm:p-4 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isCompleted
          ? 'opacity-65 bg-slate-50/90 dark:bg-slate-900/60 border-l-[5px] border-l-slate-300 dark:border-l-slate-700'
          : `${theme.accentBorder} ${theme.hoverBorder} ${theme.subtleBg} ${theme.glow}`
      } ${
        isTimerActive
          ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-indigo-500/10 shadow-lg'
          : ''
      }`}
    >
      {/* Top Meta Line: Priority Selector + Origin Tag + Actions Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {/* Quick Priority Switcher */}
          <PrioritySelect taskId={task.id} currentQuadrant={task.quadrant} isCompact={isCompact} />

          {/* Source Origin Tag: OpenProject vs User Added */}
          {task.openproject_id ? (
            <a
              href={task.openproject_url || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition-colors shadow-2xs"
              title={`Synced from OpenProject #${task.openproject_id}`}
            >
              <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>OP #{task.openproject_id}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-600/50 shadow-2xs"
              title="User Added Task"
            >
              <User className="w-2.5 h-2.5 text-slate-400" />
              <span>User Added</span>
            </span>
          )}
        </div>

        {/* Action Controls Toolbar */}
        <div
          className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pomodoro Focus Button / Active Indicator */}
          {!isCompleted && (
            <button
              onClick={() => setActiveTimerTask(isTimerActive ? null : task)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isTimerActive
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700/60'
              }`}
              title={isTimerActive ? 'Active Focus Session' : 'Focus with Pomodoro'}
            >
              <Flame className={`w-3.5 h-3.5 ${isTimerActive ? 'animate-bounce' : ''}`} />
            </button>
          )}

          {/* Edit Task Button */}
          <button
            onClick={() => setEditingTask(task)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Task Button */}
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Task Core: Checkbox, Title & Description */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={handleToggleComplete}
          className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white/50 dark:bg-slate-700/50'
          }`}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted && <CheckSquare className="w-3.5 h-3.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <h4
            className={`text-[14.5px] font-bold leading-snug break-words tracking-tight transition-colors ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            }`}
          >
            {task.title}
          </h4>

          {task.description && !isCompact && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed font-normal">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Middle Tags Row: Category & Severity Chips (if present) */}
      {(task.category_name || severityBadge) && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {task.category_name && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs"
              style={{
                backgroundColor: `${task.category_color}12`,
                color: task.category_color,
                borderColor: `${task.category_color}35`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: task.category_color }}
              />
              <span className="truncate max-w-[130px]">{task.category_name}</span>
            </span>
          )}

          {severityBadge && (
            <span
              className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border shadow-2xs ${severityBadge.className}`}
              title={`Severity: ${task.severity}`}
            >
              {severityBadge.icon}
              <span>{severityBadge.label}</span>
            </span>
          )}
        </div>
      )}

      {/* Footer Info & Status Selector Row */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
        {/* Left: Due Date, Delegatee, Pomodoro Count */}
        <div className="flex items-center gap-2 flex-wrap">
          {dueStatus && (
            <div
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border shadow-2xs ${dueStatus.className}`}
              title={dueStatus.isOverdue ? 'Overdue Date' : 'Due Date'}
            >
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{dueStatus.label}</span>
            </div>
          )}

          {task.delegatee && (
            <div
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
              title={task.openproject_id ? `QA Contact: ${task.delegatee}` : `Delegatee: ${task.delegatee}`}
            >
              <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[120px]">
                {task.openproject_id ? `QA: ${task.delegatee}` : task.delegatee}
              </span>
            </div>
          )}

          {task.pomodoro_count > 0 && (
            <div
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs"
              title={`${task.pomodoro_count} focus session(s) completed`}
            >
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{task.pomodoro_count}🍅</span>
            </div>
          )}
        </div>

        {/* Right: Quick Status Switcher Dropdown */}
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect taskId={task.id} currentStatus={task.status} />
        </div>
      </div>
    </div>
  );
};
