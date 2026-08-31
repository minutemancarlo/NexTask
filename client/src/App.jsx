import React from 'react';
import { Header } from './components/common/Header';
import { FilterBar } from './components/common/FilterBar';
import { MatrixView } from './components/matrix/MatrixView';
import { KanbanView } from './components/kanban/KanbanView';
import { ListView } from './components/list/ListView';
import { OpenProjectDashboard } from './components/openproject/OpenProjectDashboard';
import { TaskModal } from './components/task/TaskModal';
import { SettingsModal } from './components/common/SettingsModal';
import { SyncReviewModal } from './components/openproject/SyncReviewModal';
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { useTasks } from './context/TaskContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 font-mono bg-slate-800 p-3 rounded-xl border border-slate-700 text-left overflow-auto max-h-40">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-sm transition-all cursor-pointer"
          >
            Reload NexTask
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { activeView, loading, error, refreshData } = useTasks();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Filter and Search Bar (for Task views: Matrix, Kanban, List) */}
      {activeView !== 'openproject' && <FilterBar />}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Loading NexTask dashboard...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-500 mb-4 border border-red-200 dark:border-red-800/40">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Backend Connection Error
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {error}
            </p>
            <button
              onClick={refreshData}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Try Reconnecting
            </button>
          </div>
        ) : (
          <>
            {activeView === 'matrix' && <MatrixView />}
            {activeView === 'kanban' && <KanbanView />}
            {activeView === 'list' && <ListView />}
            {activeView === 'openproject' && <OpenProjectDashboard />}
          </>
        )}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal />

      {/* Settings & Persistence Modal */}
      <SettingsModal />

      {/* OpenProject Ticket Sync & Review Modal */}
      <SyncReviewModal />

      {/* Floating Pomodoro Focus Timer */}
      <PomodoroTimer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
