import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: undefined, bottom: undefined, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // If button has scrolled out of view, close dropdown
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const menuWidth = 176; // 11rem = 176px
    const menuHeight = 185; // approx height of menu
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight && rect.top > spaceBelow;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({
      top: placeAbove ? undefined : Math.round(rect.bottom + 6),
      bottom: placeAbove ? Math.round(window.innerHeight - rect.top + 6) : undefined,
      left: Math.round(left),
    });
  }, []);

  // Update position on open, window resize, and any container scroll
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

  const currentMeta = STATUSES.find(s => s.id === currentStatus) || STATUSES[0];

  const handleSelect = async (statusId, e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (statusId !== currentStatus) {
      await updateTask(taskId, { status: statusId });
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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize tracking-normal transition-all cursor-pointer shadow-2xs ${currentMeta.badgeClass}`}
        title="Click to switch status"
      >
        <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass}`} />
        <span>{currentMeta.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu rendered via Portal into document.body to guarantee foreground placement */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : 'auto',
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
              left: `${coords.left}px`,
              width: '11rem',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
};
