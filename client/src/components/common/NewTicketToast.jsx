import React from 'react';
import { Bell, Check, ExternalLink, X, ArrowRight, Layers } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const NewTicketToast = () => {
  const {
    activeNewTicketAlert,
    dismissNewTicketAlert,
    quickSyncNewTicket,
    openSyncReview,
    setActiveView,
  } = useTasks();

  if (!activeNewTicketAlert || !activeNewTicketAlert.latestTicket) {
    return null;
  }

  const { count, latestTicket, tickets } = activeNewTicketAlert;

  const handleReviewAll = () => {
    dismissNewTicketAlert();
    openSyncReview({
      projectId: latestTicket.projectName,
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 p-5">
        
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400"></div>

        <div className="flex items-start gap-4">
          
          {/* Animated Bell Badge with Sound Chime Ripple */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] text-white font-bold items-center justify-center">
                {count}
              </span>
            </span>
          </div>

          {/* Ticket Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                  NEW TICKET
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  #{latestTicket.opId}
                </span>
              </div>
              <button
                onClick={dismissNewTicketAlert}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
              {latestTicket.subject}
            </h4>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3.5 flex-wrap">
              {latestTicket.projectName && (
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  {latestTicket.projectName}
                </span>
              )}
              {latestTicket.qaContact && (
                <span>• QA: {latestTicket.qaContact}</span>
              )}
              {latestTicket.severity && (
                <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                  {latestTicket.severity}
                </span>
              )}
            </div>

            {count > 1 && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-3">
                + {count - 1} more new ticket{count - 1 > 1 ? 's' : ''} detected
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => quickSyncNewTicket(latestTicket)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sync to Matrix</span>
              </button>

              <button
                onClick={handleReviewAll}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {latestTicket.ticketUrl && (
                <a
                  href={latestTicket.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700/50"
                  title="Open in OpenProject"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
