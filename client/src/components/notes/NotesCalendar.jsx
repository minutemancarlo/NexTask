import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const NotesCalendar = () => {
  const { stats, selectedDate, setSelectedDate } = useNotes();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Compute month calendar days
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        count: stats[dateStr] || 0,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        count: stats[dateStr] || 0,
      });
    }

    // Next month padding to fill out complete 7-day rows (up to 35 or 42 cells)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      cells.push({
        dayNum: n,
        dateStr,
        isCurrentMonth: false,
        count: stats[dateStr] || 0,
      });
    }

    return cells;
  }, [year, month, stats]);

  // Total notes count in current month
  const monthlyNotesCount = useMemo(() => {
    return calendarCells
      .filter(c => c.isCurrentMonth)
      .reduce((sum, c) => sum + c.count, 0);
  }, [calendarCells]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs">
      
      {/* Calendar Header: Month/Year + Navigation */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {monthName} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Jump to today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Date Filter Notification */}
      {selectedDate && (
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[11px]">Filtered:</span>
            <span className="font-mono text-[11px] font-bold">{selectedDate}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
            title="Clear date filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Days of Week Row */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS_OF_WEEK.map((d, index) => (
          <div
            key={d}
            className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
              index === 0 || index === 6 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map((cell, idx) => {
          const isSelected = selectedDate === cell.dateStr;
          const isToday = todayStr === cell.dateStr;
          const hasNotes = cell.count > 0;

          return (
            <button
              key={`${cell.dateStr}-${idx}`}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setSelectedDate(null);
                } else {
                  setSelectedDate(cell.dateStr);
                }
              }}
              title={
                hasNotes
                  ? `${cell.count} note${cell.count === 1 ? '' : 's'} on ${cell.dateStr}`
                  : cell.dateStr
              }
              className={`relative flex items-center justify-center h-8 rounded-xl text-xs transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-xs scale-105 z-10 ring-2 ring-indigo-400 dark:ring-indigo-300'
                  : isToday && hasNotes
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500 shadow-2xs hover:bg-indigo-200 dark:hover:bg-indigo-900'
                  : hasNotes && cell.isCurrentMonth
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 shadow-2xs'
                  : isToday
                  ? 'ring-1.5 ring-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800'
                  : cell.isCurrentMonth
                  ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <span>{cell.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-700 inline-block" />
          <span>Has memos</span>
        </span>
        <span className="font-medium">
          {monthlyNotesCount} note{monthlyNotesCount === 1 ? '' : 's'} this month
        </span>
      </div>

    </div>
  );
};
