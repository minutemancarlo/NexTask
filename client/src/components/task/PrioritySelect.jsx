import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

const QUADRANTS = [
  {
    id: 'Q1',
    label: 'Do First',
    desc: 'Urgent & Important',
    badgeClass: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 hover:bg-red-200/70 dark:hover:bg-red-900/60',
    dotClass: 'bg-red-500',
  },
  {
    id: 'Q2',
    label: 'Schedule',
    desc: 'Important, Not Urgent',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 hover:bg-amber-200/70 dark:hover:bg-amber-900/60',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'Q3',
    label: 'Delegate',
    desc: 'Urgent, Not Important',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 hover:bg-blue-200/70 dark:hover:bg-blue-900/60',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'Q4',
    label: 'Eliminate',
    desc: 'Not Urgent & Not Important',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80',
    dotClass: 'bg-slate-400',
  },
];

export const PrioritySelect = ({ taskId, currentQuadrant, isCompact = false }) => {
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

  const currentMeta = QUADRANTS.find(q => q.id === currentQuadrant) || QUADRANTS[0];

  const handleSelect = async (quadrantId, e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (quadrantId !== currentQuadrant) {
      await updateTask(taskId, { quadrant: quadrantId });
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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${currentMeta.badgeClass}`}
        title="Click to switch priority quadrant"
      >
        <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass}`} />
        <span>{currentMeta.id} {isCompact ? '' : `• ${currentMeta.label}`}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            Change Quadrant
          </div>
          {QUADRANTS.map((q) => {
            const isSelected = q.id === currentQuadrant;
            return (
              <button
                key={q.id}
                type="button"
                onClick={(e) => handleSelect(q.id, e)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-50/80 dark:bg-slate-700/40 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${q.dotClass}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {q.id}: {q.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {q.desc}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
