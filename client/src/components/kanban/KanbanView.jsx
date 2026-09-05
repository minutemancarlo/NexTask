import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from '../task/TaskCard';
import { useTasks } from '../../context/TaskContext';

const COLUMNS = [
  {
    id: 'todo',
    title: 'To Do / Backlog',
    strip: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600',
    headerBg: 'bg-gradient-to-r from-slate-500/10 via-slate-500/5 to-transparent dark:from-slate-800/80 dark:to-slate-900/40',
    headerBorder: 'border-b border-slate-200 dark:border-slate-800',
    dot: 'bg-slate-500 ring-4 ring-slate-400/20 shadow-xs shadow-slate-500/30',
    titleColor: 'text-slate-800 dark:text-slate-200',
    badge: 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    strip: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
    headerBg: 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent dark:from-amber-950/60 dark:via-orange-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-amber-200/80 dark:border-amber-900/50',
    dot: 'bg-amber-500 ring-4 ring-amber-500/20 shadow-xs shadow-amber-500/50',
    titleColor: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80',
  },
  {
    id: 'delegated',
    title: 'Delegated / Waiting',
    strip: 'bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600',
    headerBg: 'bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-transparent dark:from-blue-950/60 dark:via-sky-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-blue-200/80 dark:border-blue-900/50',
    dot: 'bg-blue-500 ring-4 ring-blue-500/20 shadow-xs shadow-blue-500/50',
    titleColor: 'text-blue-950 dark:text-blue-100',
    badge: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800/80',
  },
  {
    id: 'completed',
    title: 'Completed',
    strip: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
    headerBg: 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent dark:from-emerald-950/60 dark:via-teal-950/30 dark:to-slate-900/40',
    headerBorder: 'border-b border-emerald-200/80 dark:border-emerald-900/50',
    dot: 'bg-emerald-500 ring-4 ring-emerald-500/20 shadow-xs shadow-emerald-500/50',
    titleColor: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80',
  },
];

export const KanbanView = () => {
  const { filteredTasks, moveTaskStatus, setEditingTask, setDefaultQuadrantForNew } = useTasks();
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await moveTaskStatus(taskId, colId);
    }
  };

  return (
    <div className="flex-1 px-3.5 sm:px-5 lg:px-6 py-4 w-full overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[760px]">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-2xl bg-white/80 dark:bg-slate-900/70 border backdrop-blur-sm shadow-xs transition-all duration-150 overflow-hidden min-h-[520px] ${
                isOver
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-[1.01] bg-indigo-50/20 dark:bg-indigo-950/20'
                  : 'border-slate-200/90 dark:border-slate-800'
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`h-1.5 w-full ${col.strip}`} />

              {/* Column Header */}
              <div className={`p-4 flex items-center justify-between transition-colors ${col.headerBg} ${col.headerBorder}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${col.dot}`} />
                  <h3 className={`text-sm font-extrabold uppercase tracking-wider ${col.titleColor}`}>
                    {col.title}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setDefaultQuadrantForNew('Q1');
                    setEditingTask('new');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Add Task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Task Cards Column */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Drag tasks here
                    </p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isCompact={false} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
