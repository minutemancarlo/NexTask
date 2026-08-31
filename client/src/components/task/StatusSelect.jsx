import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

const STATUSES = [
  {
    id: 'todo',
    label: 'To Do',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700',
    dotClass: 'bg-slate-500',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 hover:bg-amber-200/80 dark:hover:bg-amber-900/60',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'delegated',
    label: 'Delegated',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 hover:bg-blue-200/80 dark:hover:bg-blue-900/60',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'completed',
    label: 'Completed',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60',
    dotClass: 'bg-emerald-500',
  },
];

export const StatusSelect = ({ taskId, currentStatus }) => {
  const { updateTask } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  const currentMeta = STATUSES.find(s => s.id === currentStatus) || STATUSES[0];

  const handleSelect = async (statusId, e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (statusId !== currentStatus) {
      await updateTask(taskId, { status: statusId });
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize tracking-normal transition-all cursor-pointer shadow-2xs ${currentMeta.badgeClass}`}
        title="Click to switch status"
      >
        <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass}`} />
        <span>{currentMeta.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            Change Status
          </div>
          {STATUSES.map((s) => {
            const isSelected = s.id === currentStatus;
            return (
              <button
                key={s.id}
                type="button"
                onClick={(e) => handleSelect(s.id, e)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-xs ${
                  isSelected ? 'bg-slate-50/80 dark:bg-slate-700/40 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dotClass}`} />
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {s.label}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
