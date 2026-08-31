import React, { useRef } from 'react';
import { Bell, Check, ExternalLink, X, ArrowRight, Layers, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const NewTicketToast = () => {
  const {
    activeNewTicketAlerts = [],
    dismissNewTicketAlert,
    quickSyncNewTicket,
    quickSyncAllNewTickets,
    openSyncReview,
  } = useTasks();

  const scrollRef = useRef(null);

  if (!activeNewTicketAlerts || activeNewTicketAlerts.length === 0) {
    return null;
  }

  const handleReviewAll = () => {
    const firstProject = activeNewTicketAlerts[0]?.projectName;
    dismissNewTicketAlert(); // clear queue
    openSyncReview({
      projectId: firstProject,
    });
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-4xl w-[92vw] sm:w-[640px] md:w-[760px] flex flex-col gap-2.5 pointer-events-auto select-none">
      
      {/* Top Multi-Ticket Batch Actions Bar if 2 or more tickets exist */}
      {activeNewTicketAlerts.length > 1 && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-900/98 border border-indigo-500/40 text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wide">
              {activeNewTicketAlerts.length} Unseen New Tickets
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              (Scroll horizontally →)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Scroll Nav Buttons */}
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

            <button
              onClick={quickSyncAllNewTickets}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
              title="Sync all unseen tickets to Matrix"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Sync All</span>
            </button>

            <button
              onClick={() => dismissNewTicketAlert()}
              className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Dismiss all unseen alerts"
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Container for Notification Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 px-0.5 scrollbar-thin scrollbar-thumb-indigo-500/40 scrollbar-track-slate-200 dark:scrollbar-track-slate-800 snap-x snap-mandatory scroll-smooth"
      >
        {activeNewTicketAlerts.map((ticket, index) => (
          <div
            key={ticket.opId || index}
            className="w-[320px] sm:w-[350px] flex-shrink-0 snap-start relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/15 p-4 flex flex-col justify-between transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400"></div>

            <div>
              <div className="flex items-start gap-3 mb-2">
                {/* Bell Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                </div>

                {/* Header Badge & Dismiss */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex-shrink-0">
                        NEW TICKET
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono truncate">
                        #{ticket.opId}
                      </span>
                    </div>

                    <button
                      onClick={() => dismissNewTicketAlert(ticket.opId)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                      aria-label="Dismiss ticket alert"
                      title="Dismiss this notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject Title */}
              <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 leading-snug">
                {ticket.subject}
              </h4>

              {/* Metadata Badges */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
                {ticket.projectName && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[200px]">
                    <Layers className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{ticket.projectName}</span>
                  </span>
                )}
                {ticket.qaContact && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">• QA: {ticket.qaContact}</span>
                )}
                {ticket.severity && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                    {ticket.severity}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
              <button
                onClick={() => quickSyncNewTicket(ticket)}
                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>

              <button
                onClick={handleReviewAll}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {ticket.ticketUrl && (
                <a
                  href={ticket.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700/50"
                  title="Open in OpenProject"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
