import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: undefined, bottom: undefined, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const menuWidth = 224; // 14rem = 224px (w-56)
    const menuHeight = 220; // approx height of menu
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight && rect.top > spaceBelow;

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    setCoords({
      top: placeAbove ? undefined : Math.round(rect.bottom + 6),
      bottom: placeAbove ? Math.round(window.innerHeight - rect.top + 6) : undefined,
      left: Math.round(left),
    });
  }, []);

  // Update position on open, resize, and scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
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
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
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

      {/* Popover Menu rendered via Portal into document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : 'auto',
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
              left: `${coords.left}px`,
              width: '14rem',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
};
