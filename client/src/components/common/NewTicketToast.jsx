import React, { useState } from 'react';
import { Bell, Check, ExternalLink, X, ArrowRight, Layers, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const NewTicketToast = () => {
  const {
    activeNewTicketAlerts = [],
    dismissNewTicketAlert,
    quickSyncNewTicket,
    quickSyncAllNewTickets,
    openSyncReview,
  } = useTasks();

  const [isExpanded, setIsExpanded] = useState(false);

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

  // Display top 3 tickets when collapsed, or all tickets when expanded
  const displayedTickets = isExpanded ? activeNewTicketAlerts : activeNewTicketAlerts.slice(0, 3);
  const hiddenCount = activeNewTicketAlerts.length - displayedTickets.length;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full sm:w-[500px] flex flex-col gap-3 pointer-events-auto select-none transition-all duration-200">
      
      {/* Top Batch Header Bar if multiple tickets exist */}
      {activeNewTicketAlerts.length > 1 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/98 border border-indigo-500/40 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-wide truncate">
                {activeNewTicketAlerts.length} Unseen New Tickets
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Detected from OpenProject Live Monitor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={quickSyncAllNewTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Sync all unseen tickets to Matrix"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Sync All</span>
            </button>

            <button
              onClick={() => dismissNewTicketAlert()}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Dismiss all unseen alerts"
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}

      {/* Spacious Scrollable Notification List */}
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-indigo-500/40 scrollbar-track-transparent">
        {displayedTickets.map((ticket, index) => (
          <div
            key={ticket.opId || index}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/10 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
          >
            {/* Top Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400"></div>

            <div className="flex items-start gap-3.5">
              {/* Bell Badge */}
              <div className="relative flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                  <Bell className="w-4 h-4" />
                </div>
              </div>

              {/* Ticket Main Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex-shrink-0">
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
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Subject Title */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2 break-words">
                  {ticket.subject}
                </h4>

                {/* Metadata Pills */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3.5 flex-wrap">
                  {ticket.projectName && (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                      <Layers className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{ticket.projectName}</span>
                    </span>
                  )}
                  {ticket.qaContact && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      QA: {ticket.qaContact}
                    </span>
                  )}
                  {ticket.severity && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/60 dark:border-amber-800/40">
                      {ticket.severity}
                    </span>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => quickSyncNewTicket(ticket)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sync to Matrix</span>
                  </button>

                  <button
                    onClick={handleReviewAll}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
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
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expand / Collapse Toggle if more than 3 tickets */}
      {activeNewTicketAlerts.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          {isExpanded ? (
            <>
              <span>Collapse List</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Show {hiddenCount} More Unseen Ticket{hiddenCount > 1 ? 's' : ''}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}

    </div>
  );
};
