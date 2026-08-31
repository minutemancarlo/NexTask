import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  TableProperties,
  X,
  ArrowUpDown,
  Bug,
  HelpCircle,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { api } from '../../services/api';
import { StatusFilterSelect } from '../common/StatusFilterSelect';

export const OpenProjectDashboard = () => {
  const { settings, setIsSettingsOpen } = useTasks();

  // Metadata for filter options
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Compute effective allowed project IDs: prioritize explicit allowedProjectIds, fallback to saved projectId if not 'all'
  const effectiveAllowedProjectIds = useMemo(() => {
    if (Array.isArray(settings.openproject?.allowedProjectIds) && settings.openproject.allowedProjectIds.length > 0) {
      return settings.openproject.allowedProjectIds.map(String);
    }
    if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
      return [String(settings.openproject.projectId)];
    }
    return [];
  }, [settings.openproject?.allowedProjectIds, settings.openproject?.projectId]);

  // Active filters - default project to saved projectId if set, otherwise first allowed project or 'all'
  const [selectedProject, setSelectedProject] = useState(() => {
    if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
      return String(settings.openproject.projectId);
    }
    if (Array.isArray(settings.openproject?.allowedProjectIds) && settings.openproject.allowedProjectIds.length === 1) {
      return String(settings.openproject.allowedProjectIds[0]);
    }
    return 'all';
  });
  const [selectedAssignee, setSelectedAssignee] = useState('me'); // Default to logged-in user
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [selectedStatusOperator, setSelectedStatusOperator] = useState('=');
  const [tableSearch, setTableSearch] = useState('');

  // Data & Extraction State
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Row Selection State
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);

  // Alias allowedProjectIds for backward compatibility
  const allowedProjectIds = effectiveAllowedProjectIds;

  // Load filter options on mount
  useEffect(() => {
    loadMetadata();
  }, []);

  // Sync selectedProject when settings.openproject?.projectId changes
  useEffect(() => {
    if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
      setSelectedProject(String(settings.openproject.projectId));
    } else if (effectiveAllowedProjectIds.length === 1) {
      setSelectedProject(effectiveAllowedProjectIds[0]);
    }
  }, [settings.openproject?.projectId, effectiveAllowedProjectIds]);

  // Ensure selectedProject is valid when effectiveAllowedProjectIds change
  useEffect(() => {
    if (
      effectiveAllowedProjectIds.length > 0 &&
      selectedProject !== 'all' &&
      !effectiveAllowedProjectIds.includes(String(selectedProject))
    ) {
      setSelectedProject(effectiveAllowedProjectIds[0] || 'all');
    }
  }, [effectiveAllowedProjectIds, selectedProject]);

  // Fetch report items whenever primary API filters or allowed project restrictions change
  useEffect(() => {
    fetchReportData();
  }, [selectedProject, selectedAssignee, selectedStatusIds, selectedStatusOperator, effectiveAllowedProjectIds]);

  const loadMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const [projList, userList, statusList] = await Promise.all([
        api.getOpenProjectProjects({
          host: settings.openproject?.host,
          apiKey: settings.openproject?.apiKey,
          mock: settings.openproject?.mock,
        }).catch(() => []),
        api.getOpenProjectUsers({
          host: settings.openproject?.host,
          apiKey: settings.openproject?.apiKey,
          mock: settings.openproject?.mock,
        }).catch(() => []),
        api.getOpenProjectStatuses({
          host: settings.openproject?.host,
          apiKey: settings.openproject?.apiKey,
          mock: settings.openproject?.mock,
        }).catch(() => []),
      ]);

      setProjects(projList || []);
      setUsers(userList || []);
      setStatuses(statusList || []);
    } catch (e) {
      console.error('Failed to load OpenProject metadata:', e);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const fetchReportData = async () => {
    setLoadingItems(true);
    setFetchError(null);
    try {
      const data = await api.getOpenProjectReportItems({
        host: settings.openproject?.host,
        apiKey: settings.openproject?.apiKey,
        mock: settings.openproject?.mock,
        projectId: selectedProject,
        allowedProjectIds: effectiveAllowedProjectIds,
        assigneeId: selectedAssignee,
        statusIds: selectedStatusIds,
        statusId: selectedStatusIds.length > 0 ? selectedStatusIds : 'all',
        statusOperator: selectedStatusOperator,
      });

      const fetchedList = data.items || [];
      setItems(fetchedList);
      // Auto-select all by default for convenience
      setSelectedRowIds(new Set(fetchedList.map(it => it.id)));
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch OpenProject report data');
      setItems([]);
      setSelectedRowIds(new Set());
    } finally {
      setLoadingItems(false);
    }
  };

  // Client-side search & sorting
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (tableSearch.trim()) {
      const query = tableSearch.toLowerCase().trim();
      result = result.filter(item => {
        return (
          String(item.id).includes(query) ||
          (item.subject && item.subject.toLowerCase().includes(query)) ||
          (item.type && item.type.toLowerCase().includes(query)) ||
          (item.status && item.status.toLowerCase().includes(query)) ||
          (item.assignee && item.assignee.toLowerCase().includes(query)) ||
          (item.project && item.project.toLowerCase().includes(query)) ||
          (item.rootCause && item.rootCause.toLowerCase().includes(query)) ||
          (item.resolution && item.resolution.toLowerCase().includes(query))
        );
      });
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'id') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, tableSearch, sortField, sortAsc]);

  // Bulk selection helpers
  const isAllSelected =
    filteredAndSortedItems.length > 0 &&
    filteredAndSortedItems.every(it => selectedRowIds.has(it.id));

  const isSomeSelected =
    filteredAndSortedItems.some(it => selectedRowIds.has(it.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const newSet = new Set(selectedRowIds);
      filteredAndSortedItems.forEach(it => newSet.delete(it.id));
      setSelectedRowIds(newSet);
    } else {
      const newSet = new Set(selectedRowIds);
      filteredAndSortedItems.forEach(it => newSet.add(it.id));
      setSelectedRowIds(newSet);
    }
  };

  const handleToggleRow = (id) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRowIds(newSet);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Download Excel Report
  const handleDownloadExcel = async (exportSelectedOnly = false) => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      const targetSelectedIds = exportSelectedOnly ? Array.from(selectedRowIds) : null;

      await api.exportOpenProjectReport({
        host: settings.openproject?.host,
        apiKey: settings.openproject?.apiKey,
        mock: settings.openproject?.mock,
        projectId: selectedProject,
        allowedProjectIds: effectiveAllowedProjectIds,
        assigneeId: selectedAssignee,
        statusIds: selectedStatusIds,
        statusId: selectedStatusIds.length > 0 ? selectedStatusIds : 'all',
        statusOperator: selectedStatusOperator,
        selectedIds: targetSelectedIds,
      });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      setExportError(err.message || 'Failed to download report');
    } finally {
      setIsExporting(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = items.length;
    const bugCount = items.filter(it => (it.type || '').toLowerCase() === 'bug').length;
    const issueCount = items.filter(it => (it.type || '').toLowerCase() !== 'bug').length;
    const withRootCause = items.filter(it => it.rootCause && it.rootCause.trim()).length;
    const withResolution = items.filter(it => it.resolution && it.resolution.trim()).length;
    const selectedCount = selectedRowIds.size;
    return { total, bugCount, issueCount, withRootCause, withResolution, selectedCount };
  }, [items, selectedRowIds]);

  const cleanHost = (settings.openproject?.host || 'https://openproject.local').replace(/\/+$/, '');

  return (
    <div className="flex-1 px-3.5 sm:px-5 lg:px-6 py-4 w-full flex flex-col gap-4">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 backdrop-blur-sm shadow-xs overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  OpenProject Extraction Dashboard
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {stats.total} Work Packages
                </span>
                {effectiveAllowedProjectIds.length > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Restricted to {effectiveAllowedProjectIds.length} Allowed Projects</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preview extracted tickets, filter by Project, Assignee, and Status, then download formatted Excel (.xlsx) reports.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={fetchReportData}
              disabled={loadingItems}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh extracted tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingItems ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export Selected */}
            <button
              onClick={() => handleDownloadExcel(true)}
              disabled={isExporting || selectedRowIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title={`Download ${selectedRowIds.size} selected ticket(s) as Excel report`}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel ({selectedRowIds.size} Selected)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Counter Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 divide-x divide-slate-200/80 dark:divide-slate-800 text-center">
          <div className="p-3">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Total Found</span>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-3">
            <span className="text-xs uppercase font-bold text-rose-600 dark:text-rose-400">Bugs</span>
            <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">{stats.bugCount}</p>
          </div>
          <div className="p-3">
            <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400">Features / Issues</span>
            <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">{stats.issueCount}</p>
          </div>
          <div className="p-3">
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">With Root Cause</span>
            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{stats.withRootCause}</p>
          </div>
          <div className="p-3">
            <span className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400">With Resolution</span>
            <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{stats.withResolution}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {exportSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Excel spreadsheet successfully generated and downloaded!</span>
        </div>
      )}

      {exportError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {fetchError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Unable to fetch tickets from OpenProject</p>
              <p className="text-slate-600 dark:text-slate-400">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer shrink-0"
          >
            Check Settings
          </button>
        </div>
      )}

      {/* Interactive Filters Panel */}
      <div className="relative z-30 bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 backdrop-blur-sm shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Report Extraction Filters</span>
          </div>

          <button
            onClick={() => {
              setSelectedProject('all');
              setSelectedAssignee('me');
              setSelectedStatusIds([]);
              setSelectedStatusOperator('=');
              setTableSearch('');
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
          >
            Reset Filters to Default
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-30">
          {/* Project Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Project
              </label>
              {effectiveAllowedProjectIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                  {effectiveAllowedProjectIds.length} Allowed
                </span>
              )}
            </div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={loadingMetadata || loadingItems}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="all">
                {allowedProjectIds.length > 0
                  ? `All Allowed Projects (${allowedProjectIds.length})`
                  : 'All Accessible Projects'}
              </option>
              {(allowedProjectIds.length > 0
                ? projects.filter((p) => allowedProjectIds.includes(String(p.id)))
                : projects
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Assignee
              </label>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold">
                Default: Me
              </span>
            </div>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              disabled={loadingMetadata || loadingItems}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="all">All Assignees</option>
              <option value="me">Assigned to Me (Currently Logged-in User)</option>
              {users
                .filter((u) => u.id !== 'me')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative z-40">
            <StatusFilterSelect
              label="Status Filter (Multi-Select)"
              operator={selectedStatusOperator}
              onOperatorChange={setSelectedStatusOperator}
              selectedStatusIds={selectedStatusIds}
              onChange={setSelectedStatusIds}
              statuses={statuses}
              helperText={
                <button
                  type="button"
                  onClick={loadMetadata}
                  disabled={loadingMetadata}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingMetadata ? 'animate-spin' : ''}`} />
                  Reload
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* Main Extraction Preview Table */}
      <div className="relative z-10 bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 backdrop-blur-sm shadow-xs overflow-hidden flex flex-col flex-1">
        {/* Table Top Controls & Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/40">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search extracted table..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {tableSearch && (
              <button
                onClick={() => setTableSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selection summary & quick toggle */}
          <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-800 dark:text-white">{filteredAndSortedItems.length}</span> of {items.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRowIds(new Set(items.map(it => it.id)))}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
              >
                Select All ({items.length})
              </button>
              <button
                onClick={() => setSelectedRowIds(new Set())}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Table View */}
        <div className="overflow-x-auto flex-1 max-h-[calc(100vh-380px)] min-h-[360px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700">
              <tr className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">
                {/* Select Checkbox Column */}
                <th className="py-3.5 px-3.5 w-12 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title={isAllSelected ? 'Deselect all' : 'Select all'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isSomeSelected ? (
                      <div className="w-4 h-4 rounded border-2 border-emerald-500 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
                        <div className="w-2 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* ID */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 w-20 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Type */}
                <th
                  onClick={() => handleSort('type')}
                  className="py-3 px-3 w-24 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Subject */}
                <th
                  onClick={() => handleSort('subject')}
                  className="py-3 px-3 min-w-[280px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Subject</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Assignee */}
                <th
                  onClick={() => handleSort('assignee')}
                  className="py-3 px-3 w-36 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Assignee</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Project */}
                <th
                  onClick={() => handleSort('project')}
                  className="py-3 px-3 w-40 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Project</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Root Cause (At the end as requested) */}
                <th className="py-3 px-3 min-w-[240px]">
                  Root Cause
                </th>

                {/* Resolution (At the end as requested) */}
                <th className="py-3 px-3 min-w-[240px]">
                  Resolution
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loadingItems ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 animate-spin text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Extracting work packages from OpenProject...</p>
                  </td>
                </tr>
              ) : filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    <TableProperties className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No work packages found matching current filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try broadening your project, assignee, or status filters.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const isSelected = selectedRowIds.has(item.id);
                  const isBug = (item.type || '').toLowerCase() === 'bug';
                  const opUrl = `${cleanHost}/work_packages/${item.id}`;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleToggleRow(item.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleRow(item.id)}
                          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* ID Link */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        <a
                          href={opUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                          title="View work package in OpenProject"
                        >
                          <span>#{item.id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 ${
                            isBug
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {isBug ? <Bug className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                          <span>{item.type}</span>
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-3.5">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                          {item.subject}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700">
                          {item.status}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-3.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {item.assignee || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>

                      {/* Project */}
                      <td className="py-3.5 px-3.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {item.project || '-'}
                      </td>

                      {/* Root Cause */}
                      <td className="py-3.5 px-3.5 text-sm text-slate-600 dark:text-slate-400">
                        {item.rootCause ? (
                          <span className="line-clamp-2" title={item.rootCause}>
                            {item.rootCause}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Resolution */}
                      <td className="py-3.5 px-3.5 text-sm text-slate-600 dark:text-slate-400">
                        {item.resolution ? (
                          <span className="line-clamp-2" title={item.resolution}>
                            {item.resolution}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {selectedRowIds.size} of {items.length}
            </span>
            <span>ticket(s) will be included in the exported Excel spreadsheet.</span>
          </div>

          <button
            onClick={() => handleDownloadExcel(true)}
            disabled={isExporting || selectedRowIds.size === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
