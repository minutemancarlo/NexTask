import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TableProperties,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { api } from '../../services/api';
import { StatusFilterSelect } from '../common/StatusFilterSelect';

export const OpenProjectReportModal = ({ isOpen, onClose }) => {
  const { settings } = useTasks();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Compute effective allowed project IDs: prioritize explicit allowedProjectIds, fallback to saved projectId if not 'all'
  const allowedProjectIds = React.useMemo(() => {
    if (Array.isArray(settings.openproject?.allowedProjectIds) && settings.openproject.allowedProjectIds.length > 0) {
      return settings.openproject.allowedProjectIds.map(String);
    }
    if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
      return [String(settings.openproject.projectId)];
    }
    return [];
  }, [settings.openproject?.allowedProjectIds, settings.openproject?.projectId]);

  // Filter state
  const [selectedProject, setSelectedProject] = useState(() => {
    if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
      return String(settings.openproject.projectId);
    }
    if (Array.isArray(settings.openproject?.allowedProjectIds) && settings.openproject.allowedProjectIds.length === 1) {
      return String(settings.openproject.allowedProjectIds[0]);
    }
    return 'all';
  });
  const [selectedAssignee, setSelectedAssignee] = useState('me'); // Default to 'me' as requested
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [selectedStatusOperator, setSelectedStatusOperator] = useState('=');

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReportFilters();
      setExportError(null);
      setExportSuccess(false);
      if (settings.openproject?.projectId && settings.openproject.projectId !== 'all') {
        setSelectedProject(String(settings.openproject.projectId));
      } else if (allowedProjectIds.length === 1) {
        setSelectedProject(allowedProjectIds[0]);
      }
    }
  }, [isOpen, settings.openproject?.projectId, allowedProjectIds]);

  const loadReportFilters = async () => {
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

      setProjects(projList);
      setUsers(userList);
      setStatuses(statusList);
    } catch (e) {
      console.error('Failed to load filter metadata:', e);
    } finally {
      setLoadingMetadata(false);
    }
  };

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      await api.exportOpenProjectReport({
        host: settings.openproject?.host,
        apiKey: settings.openproject?.apiKey,
        mock: settings.openproject?.mock,
        projectId: selectedProject,
        allowedProjectIds: allowedProjectIds,
        assigneeId: selectedAssignee,
        statusIds: selectedStatusIds,
        statusId: selectedStatusIds.length > 0 ? selectedStatusIds : 'all',
        statusOperator: selectedStatusOperator,
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 4000);
    } catch (err) {
      setExportError(err.message || 'Failed to download report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Extract OpenProject Excel Report
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate formatted .xlsx report with Root Cause & Resolution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Column Format Specification Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <TableProperties className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Report Column Headings</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-mono text-indigo-800 dark:text-indigo-300">
              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-center font-bold">1. ID</div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-center font-bold">2. Type</div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-center font-bold">3. Subject</div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-center font-bold">4. Root Cause</div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-center font-bold">5. Resolution</div>
            </div>
          </div>

          {/* Filters Form */}
          <div className="space-y-4 pt-1">
            {/* Project Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Project Filter
                </label>
                {allowedProjectIds.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                    {allowedProjectIds.length} Allowed
                  </span>
                )}
              </div>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={loadingMetadata}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Assignee Filter
                </label>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold">
                  Default: Logged-in User
                </span>
              </div>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                disabled={loadingMetadata}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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

            {/* Status Filter Multi-Select with IS / IS NOT */}
            <div>
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
                    onClick={loadReportFilters}
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

          {/* Feedback Messages */}
          {exportError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {exportSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Report generated and download initiated!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating .xlsx...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
