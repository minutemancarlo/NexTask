import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from '../task/TaskCard';
import { useTasks } from '../../context/TaskContext';

const QUADRANT_STYLES = {
  Q1: {
    topStrip: 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600',
    headerBg: 'bg-gradient-to-r from-red-500/15 via-rose-500/10 to-transparent dark:from-red-950/60 dark:via-rose-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-red-200/80 dark:border-red-900/50',
    cardBorder: 'border-red-200/80 dark:border-red-950/90 hover:border-red-300 dark:hover:border-red-800',
    dot: 'bg-red-500 ring-4 ring-red-500/20 shadow-xs shadow-red-500/50',
    titleColor: 'text-red-950 dark:text-red-100',
    badge: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300/80 dark:border-red-800/80',
    subtitleColor: 'text-red-700/90 dark:text-red-300/80',
    button: 'border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-100/70 dark:hover:bg-red-950/60 hover:border-red-300',
  },
  Q2: {
    topStrip: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
    headerBg: 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent dark:from-amber-950/60 dark:via-orange-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-amber-200/80 dark:border-amber-900/50',
    cardBorder: 'border-amber-200/80 dark:border-amber-950/90 hover:border-amber-300 dark:hover:border-amber-800',
    dot: 'bg-amber-500 ring-4 ring-amber-500/20 shadow-xs shadow-amber-500/50',
    titleColor: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80',
    subtitleColor: 'text-amber-800/90 dark:text-amber-300/80',
    button: 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 hover:border-amber-300',
  },
  Q3: {
    topStrip: 'bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600',
    headerBg: 'bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-transparent dark:from-blue-950/60 dark:via-sky-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-blue-200/80 dark:border-blue-900/50',
    cardBorder: 'border-blue-200/80 dark:border-blue-950/90 hover:border-blue-300 dark:hover:border-blue-800',
    dot: 'bg-blue-500 ring-4 ring-blue-500/20 shadow-xs shadow-blue-500/50',
    titleColor: 'text-blue-950 dark:text-blue-100',
    badge: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800/80',
    subtitleColor: 'text-blue-700/90 dark:text-blue-300/80',
    button: 'border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-950/60 hover:border-blue-300',
  },
  Q4: {
    topStrip: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600',
    headerBg: 'bg-gradient-to-r from-slate-400/15 via-slate-500/10 to-transparent dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900/40',
    headerBorder: 'border-b border-slate-200 dark:border-slate-800',
    cardBorder: 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
    dot: 'bg-slate-500 ring-4 ring-slate-400/20 shadow-xs shadow-slate-500/30',
    titleColor: 'text-slate-900 dark:text-slate-100',
    badge: 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
    subtitleColor: 'text-slate-600 dark:text-slate-400',
    button: 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300',
  },
};

export const QuadrantCard = ({
  quadrantId,
  title,
  subtitle,
  description,
  accentColor,
  headerBg,
  tasks,
}) => {
  const { moveTaskQuadrant, setEditingTask, setDefaultQuadrantForNew } = useTasks();
  const [isDragOver, setIsDragOver] = useState(false);

  const style = QUADRANT_STYLES[quadrantId] || QUADRANT_STYLES.Q1;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await moveTaskQuadrant(taskId, quadrantId);
    }
  };

  const handleQuickAdd = () => {
    setDefaultQuadrantForNew(quadrantId);
    setEditingTask('new');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full rounded-2xl bg-white/80 dark:bg-slate-900/70 border backdrop-blur-sm shadow-xs transition-all duration-200 overflow-hidden ${style.cardBorder} ${
        isDragOver
          ? 'ring-2 ring-indigo-500/40 scale-[1.008] bg-indigo-50/20 dark:bg-indigo-950/20'
          : ''
      }`}
    >
      {/* Top Accent Strip */}
      <div className={`h-1.5 w-full ${style.topStrip}`} />

      {/* Quadrant Header */}
      <div className={`px-4.5 py-3.5 flex items-center justify-between transition-colors ${style.headerBg} ${style.headerBorder}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${style.dot}`} />
            <h3 className={`text-base font-extrabold tracking-tight ${style.titleColor}`}>
              {title}
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${style.badge}`}>
              {tasks.length}
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${style.subtitleColor}`}>
            <span className="font-semibold">{subtitle}</span> • <span className="italic">{description}</span>
          </p>
        </div>

        <button
          onClick={handleQuickAdd}
          className={`p-2 rounded-xl bg-white/90 dark:bg-slate-800 shadow-xs transition-all cursor-pointer border ${style.button}`}
          title={`Add task to ${title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task List Container */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto min-h-[240px] max-h-[calc(50vh-30px)]">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
              No tasks in this quadrant
            </p>
            <button
              onClick={handleQuickAdd}
              className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Add a task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};
