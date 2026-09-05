import React from 'react';
import {
  Bell,
  Check,
  ExternalLink,
  X,
  ArrowRight,
  Layers,
  CheckCheck,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Trash2,
  Share2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const NewTicketToast = () => {
  const {
    activeNewTicketAlerts = [],
    activeAssigneeAlerts = [],
    serverDownAlert = null,
    dismissNewTicketAlert,
    dismissAssigneeAlert,
    dismissServerDownAlert,
    quickSyncNewTicket,
    quickSyncAllNewTickets,
    keepReassignedTask,
    delegateReassignedTask,
    removeReassignedTask,
    openSyncReview,
    setIsSettingsOpen,
  } = useTasks();

  const totalAlertsCount =
    activeNewTicketAlerts.length +
    activeAssigneeAlerts.length +
    (serverDownAlert ? 1 : 0);

  if (totalAlertsCount === 0) {
    return null;
  }

  const handleReviewAll = () => {
    const firstProject = activeNewTicketAlerts[0]?.projectName;
    dismissNewTicketAlert(); // clear queue
    openSyncReview({
      projectId: firstProject,
    });
  };

  const handleDismissAll = () => {
    dismissNewTicketAlert();
    dismissAssigneeAlert();
    dismissServerDownAlert();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full flex flex-col gap-3 pointer-events-auto select-none">
      
      {/* Top Multi-Alert Batch Actions Bar if 2 or more alerts exist */}
      {totalAlertsCount > 1 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/98 border border-indigo-500/40 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-wide truncate">
                {totalAlertsCount} Live Monitor Notifications
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {activeNewTicketAlerts.length > 0 && `${activeNewTicketAlerts.length} New`}
                {activeNewTicketAlerts.length > 0 && (activeAssigneeAlerts.length > 0 || serverDownAlert) && ' • '}
                {activeAssigneeAlerts.length > 0 && `${activeAssigneeAlerts.length} Reassigned`}
                {activeAssigneeAlerts.length > 0 && serverDownAlert && ' • '}
                {serverDownAlert && 'Server Alert'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {activeNewTicketAlerts.length > 0 && (
              <button
                onClick={quickSyncAllNewTickets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Sync all unseen new tickets to Matrix"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Sync All</span>
              </button>
            )}

            <button
              onClick={handleDismissAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Dismiss all unseen alerts"
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}

      {/* Vertical Scrollable Container with Notification Cards */}
      <div className="flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
        
        {/* 1. OpenProject Server Down Alert Card */}
        {serverDownAlert && (
          <div className="w-full relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-500/70 shadow-2xl shadow-rose-500/20 p-4.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 flex-shrink-0">
            {/* Top Red Gradient Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500"></div>

            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 mb-2 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 flex-shrink-0">
                  {serverDownAlert.failureCount >= 3 ? 'SERVER UNREACHABLE (3 RETRIES)' : 'SERVER DOWN'}
                </span>
              </div>

              <button
                onClick={dismissServerDownAlert}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                aria-label="Dismiss server alert"
                title="Dismiss this notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2">
              {serverDownAlert.failureCount >= 3
                ? 'OpenProject Server Still Unreachable After 3 Retries'
                : 'OpenProject Server Connection Failed'}
            </h4>

            {/* Error Details Box */}
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 text-xs text-rose-800 dark:text-rose-300 mb-3.5 break-words">
              <p className="font-mono text-[11px] mb-1 leading-relaxed">
                {serverDownAlert.message || 'Connection to OpenProject failed.'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {serverDownAlert.failureCount >= 3
                  ? 'Live Monitor attempted 3 retries. Please check your VPN, host URL, or API token.'
                  : 'Live Monitor is retrying in background...'}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/90">
              <button
                onClick={() => {
                  dismissServerDownAlert();
                  setIsSettingsOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Check Settings</span>
              </button>

              <button
                onClick={dismissServerDownAlert}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* 1. Assignee Changed Alert Cards */}
        {activeAssigneeAlerts.map((item, index) => (
          <div
            key={`reassign-${item.opId || index}`}
            className="w-full relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20 p-4.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 flex-shrink-0"
          >
            {/* Top Amber-Orange Gradient Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>

            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 mb-2 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs flex-shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex-shrink-0">
                  ASSIGNEE CHANGED
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono truncate">
                  #{item.opId}
                </span>
              </div>

              <button
                onClick={() => dismissAssigneeAlert(item.opId)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                aria-label="Dismiss reassignment alert"
                title="Dismiss this notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subject Title */}
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2.5 break-words">
              {item.subject}
            </h4>

            {/* Reassignment Highlight Box */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-xs mb-3">
              <div className="flex items-center gap-2 flex-wrap text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Reassigned from:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {item.previousAssignee || 'You'}
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">➔</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  {item.newAssignee || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Project Tag Pill */}
            {item.projectName && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                  <Layers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="break-all">{item.projectName}</span>
                </span>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/90 flex-wrap">
              {/* Keep in Matrix */}
              <button
                onClick={() => keepReassignedTask(item.taskId, item.opId, item.newAssignee, item.newAssigneeId)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Retain this task in your board with updated assignee info"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Keep Task</span>
              </button>

              {/* Delegate to Q3 */}
              <button
                onClick={() => delegateReassignedTask(item.taskId, item.opId, item.newAssignee, item.newAssigneeId)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Move task to Q3 (Delegate) with new assignee as delegatee"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Delegate</span>
              </button>

              {/* Remove from Matrix */}
              {item.taskId && (
                <button
                  onClick={() => removeReassignedTask(item.taskId, item.opId)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                  title="Remove from your board since it is no longer assigned to you"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}

              {/* Open in OpenProject */}
              {item.ticketUrl && (
                <a
                  href={item.ticketUrl}
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
        ))}

        {/* 2. New Ticket Alert Cards */}
        {activeNewTicketAlerts.map((ticket, index) => (
          <div
            key={`new-${ticket.opId || index}`}
            className="w-full relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 p-4.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 flex-shrink-0"
          >
            {/* Top Gradient Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400"></div>

            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 mb-2 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
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

            {/* Full View Subject Title */}
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2.5 break-words">
              {ticket.subject}
            </h4>

            {/* Metadata Pills */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
              {ticket.projectName && (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                  <Layers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="break-all">{ticket.projectName}</span>
                </span>
              )}
              {ticket.qaContact && (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/40">
                  QA: {ticket.qaContact}
                </span>
              )}
              {ticket.severity && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/60 dark:border-amber-800/40">
                  {ticket.severity}
                </span>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/90">
              <button
                onClick={() => quickSyncNewTicket(ticket)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Sync to Matrix</span>
              </button>

              <button
                onClick={handleReviewAll}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {ticket.ticketUrl && (
                <a
                  href={ticket.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700/50"
                  title="Open in OpenProject"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
