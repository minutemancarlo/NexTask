import React from 'react';
import {
  LayoutGrid,
  Kanban,
  ListOrdered,
  FileSpreadsheet,
  Settings,
  Plus,
  Moon,
  Sun,
  CheckCircle2,
  RefreshCw,
  Radio,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const Header = () => {
  const {
    activeView,
    setActiveView,
    setEditingTask,
    setDefaultQuadrantForNew,
    settings,
    updateSettings,
    setIsSettingsOpen,
    syncOpenProject,
    isFetchingCandidates,
    tasks,
    isMonitoringActive,
    activeNewTicketAlert,
    simulateSampleNewTicket,
  } = useTasks();

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-colors">
      <div className="w-full px-3.5 sm:px-5 lg:px-6 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5">
          {/* Modern 2x2 Matrix Grid Geometric Emblem */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-2 shadow-md shadow-indigo-500/25 flex items-center justify-center group cursor-pointer transition-transform hover:scale-105 select-none">
            <div className="grid grid-cols-2 gap-1 w-full h-full">
              {/* Q1: Do First (Urgent & Important - Vibrant Coral / Rose) */}
              <div className="rounded-sm bg-rose-400 dark:bg-rose-400 shadow-2xs transition-transform group-hover:scale-95"></div>
              {/* Q2: Schedule (Important - Vibrant Indigo / Violet) */}
              <div className="rounded-sm bg-indigo-200 dark:bg-indigo-300 shadow-2xs transition-transform group-hover:scale-95"></div>
              {/* Q3: Delegate (Urgent - Amber / Gold) */}
              <div className="rounded-sm bg-amber-300 dark:bg-amber-300 shadow-2xs transition-transform group-hover:scale-95"></div>
              {/* Q4: Eliminate (Emerald / Teal) */}
              <div className="rounded-sm bg-emerald-300 dark:bg-emerald-300 shadow-2xs transition-transform group-hover:scale-95"></div>
            </div>
            {/* Center Focus Node */}
            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white shadow-xs pointer-events-none"></div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Nex<span className="text-indigo-600 dark:text-indigo-400">Task</span>
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                Priority Matrix
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              Priority Matrix & Deep Focus
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/50">
          <button
            onClick={() => setActiveView('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeView === 'matrix'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Eisenhower</span> Matrix
          </button>

          <button
            onClick={() => setActiveView('kanban')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeView === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Kanban className="w-4 h-4" />
            Kanban
          </button>

          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeView === 'list'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            List
          </button>

          <button
            onClick={() => setActiveView('openproject')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeView === 'openproject'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>OpenProject</span>
          </button>
        </div>

        {/* Right Action Bar: Quick Stats, Theme, Settings, New Task */}
        <div className="flex items-center gap-3">
          
          {/* Productivity progress chip */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>{completedCount}/{totalCount} Done ({completionPercentage}%)</span>
          </div>

          {/* Live OpenProject Monitor Indicator */}
          {isMonitoringActive && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:border-indigo-400 transition-all cursor-pointer shadow-2xs"
              title={`Live Monitor: Checking OpenProject every ${settings.openproject?.monitorInterval || 60}s for Status = New`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Live Monitor</span>
              {activeNewTicketAlert && (
                <span className="flex items-center justify-center px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                  {activeNewTicketAlert.count}
                </span>
              )}
            </button>
          )}

          {/* Quick Button for Sample New Ticket (Simulate Chime + Toast) */}
          <button
            onClick={simulateSampleNewTicket}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Simulate receiving a new ticket (triggers Ding-Dong chime, desktop alert, and in-app toast)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
            <span className="hidden md:inline">Sample New Ticket</span>
            <span className="md:hidden">Sample</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* OpenProject Quick Sync */}
          <button
            onClick={async () => {
              if (!settings.openproject?.host && !settings.openproject?.mock) {
                setIsSettingsOpen(true);
              } else {
                try {
                  await syncOpenProject();
                } catch (e) {
                  setIsSettingsOpen(true);
                }
              }
            }}
            disabled={isFetchingCandidates}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Review & Sync OpenProject Tickets"
            aria-label="Sync OpenProject"
          >
            <RefreshCw className={`w-5 h-5 text-indigo-500 ${isFetchingCandidates ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            title="Settings & Backup"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Create Task Button */}
          <button
            onClick={() => {
              setDefaultQuadrantForNew('Q1');
              setEditingTask('new');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>

      </div>
    </header>
  );
};
