import React, { useState, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  ExternalLink,
  Tag,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  HelpCircle,
  Search,
  UserCheck,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { StatusFilterSelect } from '../common/StatusFilterSelect';

export const SyncReviewModal = () => {
  const {
    isSyncReviewOpen,
    setIsSyncReviewOpen,
    syncReviewCandidates,
    syncReviewStats,
    isFetchingCandidates,
    commitSyncReview,
    categories,
  } = useTasks();

  // Local state for candidate adjustments
  const [candidates, setCandidates] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'mismatch' | 'new' | 'synced'
  const [statusFilterIds, setStatusFilterIds] = useState([]);
  const [statusFilterOperator, setStatusFilterOperator] = useState('='); // '=' for IS, '!' for IS NOT
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

  // Initialize local candidates list whenever modal opens with new candidates
  React.useEffect(() => {
    if (syncReviewCandidates && syncReviewCandidates.length > 0) {
      setCandidates(
        syncReviewCandidates.map((c) => ({
          ...c,
          // user-editable overrides
          selectedForSync: true,
          selectedQuadrant: c.suggestedQuadrant || 'Q2',
          selectedStatus: c.suggestedStatus || c.opMappedStatus || 'todo',
          selectedCategoryId: c.suggestedCategoryId || '',
          selectedDelegatee: c.delegatee || c.qaContact || '',
        }))
      );
      setCommitError(null);
    }
  }, [syncReviewCandidates]);

  // Derived filtered items
  const filteredCandidates = useMemo(() => {
    return candidates.filter((item) => {
      // Tab filter
      if (activeFilter === 'mismatch' && !item.hasStatusMismatch) return false;
      if (activeFilter === 'new' && item.isSynced) return false;
      if (activeFilter === 'synced' && !item.isSynced) return false;

      // Status selector filter with IS / IS NOT and multi-select
      if (statusFilterIds.length > 0) {
        const itemStatus = item.selectedStatus || item.opMappedStatus;
        const matches = statusFilterIds.includes(itemStatus);
        if (statusFilterOperator === '!' && matches) return false;
        if (statusFilterOperator === '=' && !matches) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.subject?.toLowerCase().includes(q);
        const matchId = String(item.opId).includes(q);
        const matchQa = item.qaContact?.toLowerCase().includes(q);
        const matchProj = item.projectName?.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchQa && !matchProj) return false;
      }

      return true;
    });
  }, [candidates, activeFilter, statusFilterIds, statusFilterOperator, searchQuery]);

  if (!isSyncReviewOpen) return null;

  const selectedCount = candidates.filter((c) => c.selectedForSync).length;
  const isAllSelected = candidates.length > 0 && selectedCount === candidates.length;

  const toggleSelectAll = () => {
    const nextVal = !isAllSelected;
    setCandidates((prev) => prev.map((c) => ({ ...c, selectedForSync: nextVal })));
  };

  const updateCandidate = (opId, patch) => {
    setCandidates((prev) =>
      prev.map((c) => (c.opId === opId ? { ...c, ...patch } : c))
    );
  };

  const handleProceedSync = async () => {
    const approvedTickets = candidates
      .filter((c) => c.selectedForSync)
      .map((c) => ({
        opId: c.opId,
        subject: c.subject,
        title: c.subject || c.formattedTitle || `#${c.opId}`,
        quadrant: c.selectedQuadrant,
        status: c.selectedStatus,
        categoryId: c.selectedCategoryId || null,
        dueDate: c.dueDate,
        delegatee: c.selectedDelegatee !== undefined ? (c.selectedDelegatee?.trim() || null) : (c.delegatee || c.qaContact || null),
        severity: c.severity,
        ticketUrl: c.ticketUrl,
      }));

    if (approvedTickets.length === 0) {
      setCommitError('Please select at least one ticket to sync.');
      return;
    }

    try {
      setIsCommitting(true);
      setCommitError(null);
      await commitSyncReview(approvedTickets);
    } catch (err) {
      setCommitError(err.message || 'Failed to sync approved tickets');
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Review & Confirm OpenProject Tickets
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {candidates.length} Fetched
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify tag categories, compare OpenProject vs NexTask statuses, and adjust priority quadrants before saving.
            </p>
          </div>

          <button
            onClick={() => setIsSyncReviewOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Stats */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Tickets ({candidates.length})
            </button>

            {syncReviewStats?.mismatchCount > 0 && (
              <button
                onClick={() => setActiveFilter('mismatch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'mismatch'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Status Mismatches ({syncReviewStats.mismatchCount})</span>
              </button>
            )}

            <button
              onClick={() => setActiveFilter('new')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'new'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              New Tickets ({syncReviewStats?.newCount ?? 0})
            </button>

            <button
              onClick={() => setActiveFilter('synced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'synced'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Already Synced ({syncReviewStats?.syncedCount ?? 0})
            </button>
          </div>

          {/* Status Specific Filter & Search Input */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-1 justify-end min-w-[280px]">
            <div className="w-full sm:w-64 md:w-72">
              <StatusFilterSelect
                label=""
                operator={statusFilterOperator}
                onOperatorChange={setStatusFilterOperator}
                selectedStatusIds={statusFilterIds}
                onChange={setStatusFilterIds}
                statuses={[
                  { id: 'todo', name: 'To Do / New / Re-Opened' },
                  { id: 'in_progress', name: 'In Progress' },
                  { id: 'delegated', name: 'Delegated' },
                  { id: 'completed', name: 'Completed / Closed', isClosed: true },
                ]}
              />
            </div>

            {/* Styled Search Input with Icon and Clear Button */}
            <div className="relative w-full sm:w-56 md:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search fetched tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="px-6 py-2.5 bg-slate-50/70 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-indigo-600 dark:text-indigo-400"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <span>
              Select All for Sync ({selectedCount} of {candidates.length} selected)
            </span>
          </label>

          {syncReviewStats?.mismatchCount > 0 && (
            <button
              type="button"
              onClick={() => {
                // Bulk apply OpenProject status to all mismatched candidates
                setCandidates((prev) =>
                  prev.map((c) =>
                    c.hasStatusMismatch ? { ...c, selectedStatus: c.opMappedStatus } : c
                  )
                );
              }}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Update All Mismatches to OpenProject Status</span>
            </button>
          )}
        </div>

        {/* Tickets Review List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isFetchingCandidates ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Fetching tickets from OpenProject...</p>
              <p className="text-xs text-slate-400 mt-1">Cross-referencing allowed projects and current status mappings</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No tickets match the selected filter</p>
            </div>
          ) : (
            filteredCandidates.map((item) => {
              return (
                <div
                  key={item.opId}
                  className={`p-4 rounded-xl border transition-all ${
                    item.selectedForSync
                      ? item.hasStatusMismatch
                        ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() =>
                        updateCandidate(item.opId, { selectedForSync: !item.selectedForSync })
                      }
                      className="mt-1 text-indigo-600 dark:text-indigo-400 cursor-pointer shrink-0"
                    >
                      {item.selectedForSync ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Main Ticket Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* OP ID Badge */}
                        <a
                          href={item.ticketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors"
                        >
                          <span>OP #{item.opId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {/* Already Synced vs New Tag */}
                        {item.isSynced ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Already Synced
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            New Import
                          </span>
                        )}

                        {/* Severity Badge */}
                        {item.severity && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                            {item.severity}
                          </span>
                        )}

                        {/* QA Contact */}
                        {item.qaContact && (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            QA: {item.qaContact}
                          </span>
                        )}

                        {/* Project Source */}
                        {item.projectName && (
                          <span className="text-xs text-slate-400 truncate max-w-[200px]">
                            • {item.projectName}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.subject}
                      </h4>

                      {/* Status Mismatch Notice (if already synced & status differs) */}
                      {item.hasStatusMismatch && (
                        <div className="p-3 rounded-xl bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>
                              <b>Status Mismatch:</b> OpenProject is{' '}
                              <span className="font-bold underline">{item.opStatusTitle}</span>, but NexTask is currently{' '}
                              <span className="font-bold uppercase tracking-wider">{item.existingTask?.status}</span>.
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateCandidate(item.opId, { selectedStatus: item.opMappedStatus })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                          >
                            Update to {item.opStatusTitle}
                          </button>
                        </div>
                      )}

                      {/* Review & Edit Controls Row: Category Tag, Quadrant, Status, Delegatee */}
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Category Tagging Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Project Tag</span>
                          </label>
                          <select
                            value={item.selectedCategoryId || ''}
                            onChange={(e) =>
                              updateCandidate(item.opId, { selectedCategoryId: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
                          >
                            <option value="">(None / General)</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Priority Quadrant */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Quadrant
                          </label>
                          <select
                            value={item.selectedQuadrant}
                            onChange={(e) =>
                              updateCandidate(item.opId, { selectedQuadrant: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            <option value="Q1">Q1: Do First</option>
                            <option value="Q2">Q2: Schedule</option>
                            <option value="Q3">Q3: Delegate</option>
                            <option value="Q4">Q4: Eliminate</option>
                          </select>
                        </div>

                        {/* Delegate / QA Contact */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span>Delegate / QA</span>
                          </label>
                          <input
                            type="text"
                            placeholder="QA / Delegate..."
                            value={item.selectedDelegatee !== undefined ? item.selectedDelegatee : (item.delegatee || item.qaContact || '')}
                            onChange={(e) =>
                              updateCandidate(item.opId, { selectedDelegatee: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>

                        {/* App Status */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Target Status
                          </label>
                          <select
                            value={item.selectedStatus}
                            onChange={(e) =>
                              updateCandidate(item.opId, { selectedStatus: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="delegated">Delegated</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {commitError ? (
              <span className="text-red-500 font-semibold">{commitError}</span>
            ) : (
              <span>
                Ready to commit <b>{selectedCount}</b> of <b>{candidates.length}</b> tickets to NexTask.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSyncReviewOpen(false)}
              disabled={isCommitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleProceedSync}
              disabled={isCommitting || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Proceed & Sync ({selectedCount} Selected)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
