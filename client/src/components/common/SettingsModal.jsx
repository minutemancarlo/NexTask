import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Plus,
  Trash2,
  Sliders,
  Database,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  Eye,
  EyeOff,
  ExternalLink,
  FolderGit2,
  Volume2,
  BellRing,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { api } from '../../services/api';
import { requestNotificationPermission } from '../../utils/notification';
import { StatusFilterSelect } from './StatusFilterSelect';
import { ProjectMultiSelect } from './ProjectMultiSelect';

export const SettingsModal = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    categories,
    createCategory,
    deleteCategory,
    openSyncReview,
    purgeAllTasks,
    refreshData,
    testDingDongChime,
    simulateSampleNewTicket,
    confirmAction,
  } = useTasks();

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [importStatus, setImportStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  // OpenProject Configuration State
  const [opHost, setOpHost] = useState(settings.openproject?.host || '');
  const [opApiKey, setOpApiKey] = useState(settings.openproject?.apiKey || '');
  const [opMock, setOpMock] = useState(settings.openproject?.mock || false);
  const [opDefaultQuadrant, setOpDefaultQuadrant] = useState(settings.openproject?.defaultQuadrant || '');
  const [showApiKey, setShowApiKey] = useState(false);

  // Real-Time / Periodic Monitoring Settings
  const [opMonitorEnabled, setOpMonitorEnabled] = useState(
    settings.openproject?.monitorEnabled !== false
  );
  const [opMonitorInterval, setOpMonitorInterval] = useState(
    settings.openproject?.monitorInterval || 60
  );
  const [opMonitorSound, setOpMonitorSound] = useState(
    settings.openproject?.monitorSound !== false
  );
  const [opMonitorBrowserNotification, setOpMonitorBrowserNotification] = useState(
    settings.openproject?.monitorBrowserNotification !== false
  );
  const [opMonitorAutoSync, setOpMonitorAutoSync] = useState(
    settings.openproject?.monitorAutoSync || false
  );
  const [notificationPermissionState, setNotificationPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // OpenProject Interactive State
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }
  const [opProjects, setOpProjects] = useState([]);
  const [opUsers, setOpUsers] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedOpProject, setSelectedOpProject] = useState(settings.openproject?.projectId || 'all');
  // Default assignee to 'me' (Currently logged in user)
  const [selectedOpAssignee, setSelectedOpAssignee] = useState(settings.openproject?.assigneeId || 'me');
  // Multi-select status filter state with IS / IS NOT conditions
  const [selectedOpStatusIds, setSelectedOpStatusIds] = useState(
    Array.isArray(settings.openproject?.statusIds)
      ? settings.openproject.statusIds
      : settings.openproject?.statusId && settings.openproject.statusId !== 'all'
      ? [String(settings.openproject.statusId)]
      : []
  );
  const [selectedOpStatusOperator, setSelectedOpStatusOperator] = useState(
    settings.openproject?.statusOperator || '='
  );

  const [opStatuses, setOpStatuses] = useState([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [tagImportStatus, setTagImportStatus] = useState('');

  // Allowed Accessible Projects Multi-Select State
  const [allowedOpProjectIds, setAllowedOpProjectIds] = useState(
    Array.isArray(settings.openproject?.allowedProjectIds)
      ? settings.openproject.allowedProjectIds.map(String)
      : []
  );

  // Danger Zone State
  const [isPurgeConfirming, setIsPurgeConfirming] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState(null);

  // Sync state if settings prop changes
  useEffect(() => {
    if (settings.openproject) {
      setOpHost(settings.openproject.host || '');
      setOpApiKey(settings.openproject.apiKey || '');
      setOpMock(settings.openproject.mock || false);
      setSelectedOpProject(settings.openproject.projectId || 'all');
      setSelectedOpAssignee(settings.openproject.assigneeId || 'me');
      setSelectedOpStatusIds(
        Array.isArray(settings.openproject.statusIds)
          ? settings.openproject.statusIds
          : settings.openproject.statusId && settings.openproject.statusId !== 'all'
          ? [String(settings.openproject.statusId)]
          : []
      );
      setSelectedOpStatusOperator(settings.openproject.statusOperator || '=');
      setOpDefaultQuadrant(settings.openproject.defaultQuadrant || '');
      setAllowedOpProjectIds(
        Array.isArray(settings.openproject.allowedProjectIds)
          ? settings.openproject.allowedProjectIds.map(String)
          : []
      );
      setOpMonitorEnabled(settings.openproject.monitorEnabled !== false);
      setOpMonitorInterval(settings.openproject.monitorInterval || 60);
      setOpMonitorSound(settings.openproject.monitorSound !== false);
      setOpMonitorBrowserNotification(settings.openproject.monitorBrowserNotification !== false);
      setOpMonitorAutoSync(settings.openproject.monitorAutoSync || false);
    }
  }, [settings.openproject]);

  // Auto-fetch OpenProject projects and users if credentials are saved and modal opens
  useEffect(() => {
    if (isSettingsOpen && (opHost || settings.openproject?.host) && (opApiKey || settings.openproject?.apiKey)) {
      if (opProjects.length === 0 && !projectsLoading) {
        handleFetchProjects();
      }
      if (opStatuses.length === 0 && !statusesLoading) {
        handleFetchStatuses();
      }
    }
  }, [isSettingsOpen, opHost, opApiKey, opProjects.length, opStatuses.length]);

  if (!isSettingsOpen) return null;

  const handleSaveOpConfig = async () => {
    const updated = {
      ...settings,
      openproject: {
        host: opHost.trim(),
        apiKey: opApiKey.trim(),
        mock: opMock,
        projectId: selectedOpProject,
        allowedProjectIds: allowedOpProjectIds,
        assigneeId: selectedOpAssignee,
        statusIds: selectedOpStatusIds,
        statusId: selectedOpStatusIds.length > 0 ? selectedOpStatusIds : 'all',
        statusOperator: selectedOpStatusOperator,
        defaultQuadrant: opDefaultQuadrant,
        monitorEnabled: opMonitorEnabled,
        monitorInterval: parseInt(opMonitorInterval, 10) || 60,
        monitorSound: opMonitorSound,
        monitorBrowserNotification: opMonitorBrowserNotification,
        monitorAutoSync: opMonitorAutoSync,
      }
    };
    await updateSettings(updated);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.testOpenProject({
        host: opHost,
        apiKey: opApiKey,
        mock: opMock,
      });
      setTestResult({
        success: true,
        message: `Connected as ${res.user?.name || 'User'}`
      });
      // Save configuration on successful test
      handleSaveOpConfig();
      // Auto fetch projects and users
      handleFetchProjects();
      handleFetchUsers();
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleFetchUsers = async () => {
    setUsersLoading(true);
    try {
      const users = await api.getOpenProjectUsers({
        host: opHost,
        apiKey: opApiKey,
        mock: opMock,
      });
      setOpUsers(users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleFetchStatuses = async () => {
    setStatusesLoading(true);
    try {
      const statuses = await api.getOpenProjectStatuses({
        host: opHost,
        apiKey: opApiKey,
        mock: opMock,
      });
      setOpStatuses(statuses);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    } finally {
      setStatusesLoading(false);
    }
  };

  const handleFetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const projects = await api.getOpenProjectProjects({
        host: opHost,
        apiKey: opApiKey,
        mock: opMock,
      });
      setOpProjects(projects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleImportProjectsAsTags = async () => {
    if (opProjects.length === 0) return;
    try {
      setTagImportStatus('Importing tags...');
      const res = await api.importOpenProjectProjects(opProjects);
      await refreshData();
      setTagImportStatus(`Imported ${res.count} project tags!`);
      setTimeout(() => setTagImportStatus(''), 3000);
    } catch (err) {
      setTagImportStatus('Import failed: ' + err.message);
    }
  };

  const handleSyncTickets = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      await handleSaveOpConfig();
      // Close Settings modal immediately so user transitions directly to the Review modal
      setIsSettingsOpen(false);
      await openSyncReview({
        host: opHost.trim(),
        apiKey: opApiKey.trim(),
        mock: opMock,
        projectId: selectedOpProject,
        allowedProjectIds: allowedOpProjectIds,
        assigneeId: selectedOpAssignee,
        statusId: selectedOpStatusIds.length > 0 ? selectedOpStatusIds : 'all',
        statusOperator: selectedOpStatusOperator,
        defaultQuadrant: opDefaultQuadrant || null,
      });
    } catch (err) {
      console.error('Candidate fetch failed:', err);
      // Re-open settings to show error if sync review failed to fetch
      setIsSettingsOpen(true);
      setSyncResult({
        success: false,
        message: err.message || 'Failed to fetch OpenProject tickets'
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory({ name: newCatName.trim(), color: newCatColor });
    setNewCatName('');
  };

  const handleExport = async () => {
    try {
      setExportStatus('Exporting...');
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clariti-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      setExportStatus('Export failed: ' + err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Importing...');
      const text = await file.text();
      const json = JSON.parse(text);
      await api.importData(json);
      await refreshData();
      setImportStatus('Data restored successfully!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      setImportStatus('Import failed: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Clariti Configuration & Settings
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* OpenProject Integration Section */}
          <div className="p-4.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  OpenProject Sync & Integration
                </h4>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                API v3
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect your self-hosted or cloud OpenProject instance to automatically sync Projects into tags and Work Packages into priority quadrants.
            </p>

            {/* Mock Mode Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Demo / Mock Mode
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Test project fetching and ticket sync without an active server
                </div>
              </div>
              <input
                type="checkbox"
                checked={opMock}
                onChange={(e) => setOpMock(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Host URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                OpenProject Host URL
              </label>
              <input
                type="url"
                disabled={opMock}
                placeholder="https://openproject.yourdomain.com"
                value={opHost}
                onChange={(e) => setOpHost(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
              />
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  User API Key
                </label>
                <a
                  href="https://www.openproject.org/docs/api/authentication/#api-key"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Where to find? <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  disabled={opMock}
                  placeholder="Paste your generated OpenProject API key..."
                  value={opApiKey}
                  onChange={(e) => setOpApiKey(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Connection Test & Config Actions */}
            <div className="flex items-center gap-2.5 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading || (!opMock && (!opHost || !opApiKey))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${testLoading ? 'animate-spin' : ''}`} />
                {testLoading ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleSaveOpConfig();
                  setTestResult({ success: true, message: 'Settings saved successfully' });
                  setTimeout(() => setTestResult(null), 3000);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-semibold transition-all cursor-pointer"
              >
                <span>Save Configuration</span>
              </button>

              {testResult && (
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${
                  testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4.5 h-4.5" /> : <AlertCircle className="w-4.5 h-4.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Project Picker & Import as Categories */}
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 space-y-3">
              {/* Allowed Accessible Projects by Default (Multi-Select) */}
              <div className="relative z-30">
                <ProjectMultiSelect
                  label="Allowed Accessible Projects by Default"
                  helperText={
                    <button
                      type="button"
                      onClick={handleFetchProjects}
                      disabled={projectsLoading}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${projectsLoading ? 'animate-spin' : ''}`} />
                      Reload Projects
                    </button>
                  }
                  selectedProjectIds={allowedOpProjectIds}
                  onChange={(newAllowed) => {
                    setAllowedOpProjectIds(newAllowed);
                    updateSettings({
                      ...settings,
                      openproject: {
                        ...(settings.openproject || {}),
                        host: opHost.trim(),
                        apiKey: opApiKey.trim(),
                        mock: opMock,
                        projectId: selectedOpProject,
                        allowedProjectIds: newAllowed,
                        assigneeId: selectedOpAssignee,
                        statusIds: selectedOpStatusIds,
                        statusId: selectedOpStatusIds.length > 0 ? selectedOpStatusIds : 'all',
                        statusOperator: selectedOpStatusOperator,
                        defaultQuadrant: opDefaultQuadrant,
                      }
                    });
                  }}
                  projects={opProjects}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Restrict Clariti to only query work packages from these chosen projects. When none are selected, all accessible projects will be queried.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Active Sync Project
                    </label>
                    <span className="text-xs text-slate-400">
                      {allowedOpProjectIds.length > 0
                        ? `Filtered to ${allowedOpProjectIds.length} allowed`
                        : 'All Projects'}
                    </span>
                  </div>
                  <select
                    value={selectedOpProject}
                    onChange={(e) => {
                      const newProj = e.target.value;
                      setSelectedOpProject(newProj);
                      updateSettings({
                        ...settings,
                        openproject: {
                          ...(settings.openproject || {}),
                          host: opHost.trim(),
                          apiKey: opApiKey.trim(),
                          mock: opMock,
                          projectId: newProj,
                          allowedProjectIds: allowedOpProjectIds,
                          assigneeId: selectedOpAssignee,
                          statusIds: selectedOpStatusIds,
                          statusId: selectedOpStatusIds.length > 0 ? selectedOpStatusIds : 'all',
                          statusOperator: selectedOpStatusOperator,
                          defaultQuadrant: opDefaultQuadrant,
                        }
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">
                      {allowedOpProjectIds.length > 0
                        ? `All Allowed Projects (${allowedOpProjectIds.length})`
                        : 'All Accessible Projects'}
                    </option>
                    {(allowedOpProjectIds.length > 0
                      ? opProjects.filter((p) => allowedOpProjectIds.includes(String(p.id)))
                      : opProjects
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Assignee Filter
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchUsers}
                      disabled={usersLoading}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin' : ''}`} />
                      Reload
                    </button>
                  </div>
                  <select
                    value={selectedOpAssignee}
                    onChange={(e) => setSelectedOpAssignee(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Assignees</option>
                    {opUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <StatusFilterSelect
                    label="Status Filter (Multi-Select)"
                    operator={selectedOpStatusOperator}
                    onOperatorChange={setSelectedOpStatusOperator}
                    selectedStatusIds={selectedOpStatusIds}
                    onChange={setSelectedOpStatusIds}
                    statuses={opStatuses}
                    helperText={
                      <button
                        type="button"
                        onClick={handleFetchStatuses}
                        disabled={statusesLoading}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${statusesLoading ? 'animate-spin' : ''}`} />
                        Reload
                      </button>
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority Mapping Override
                  </label>
                  <select
                    value={opDefaultQuadrant}
                    onChange={(e) => setOpDefaultQuadrant(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Auto (Map by Severity)</option>
                    <option value="Q1">Always Q1 (Do First)</option>
                    <option value="Q2">Always Q2 (Schedule)</option>
                    <option value="Q3">Always Q3 (Delegate)</option>
                    <option value="Q4">Always Q4 (Eliminate)</option>
                  </select>
                </div>
              </div>

              {/* Sync Configuration Info Badge */}
              <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <span>⚡ Active Sync Rules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div>• <b>Fields synced:</b> Ticket #, Subject, QA Contact, Severity, Status</div>
                  <div>• <b>Description:</b> Excluded (clean title focus)</div>
                  <div>• <b>Delegatee:</b> Set to QA Contact</div>
                  <div>• <b>Statuses synced:</b> New, Re-Opened, In Progress</div>
                </div>
              </div>

              {/* Sync Actions Bar */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={handleSyncTickets}
                  disabled={syncLoading || (!opMock && (!opHost || !opApiKey))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? 'Syncing Tickets...' : 'Sync Tickets Now'}
                </button>

                {opProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportProjectsAsTags}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-semibold transition-all cursor-pointer"
                  >
                    <FolderGit2 className="w-4 h-4 text-indigo-500" />
                    Import Projects as Tags ({opProjects.length})
                  </button>
                )}
              </div>

              {tagImportStatus && (
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {tagImportStatus}
                </p>
              )}

              {syncResult && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  syncResult.success ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                }`}>
                  {syncResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{syncResult.message}</span>
                </div>
              )}

              {/* Real-Time / Periodic Monitoring Panel */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Real-Time / Periodic Ticket Monitoring
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          Status = New
                        </span>
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically scans for newly submitted tickets and alerts you with sound & desktop alerts.
                      </p>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opMonitorEnabled}
                      onChange={(e) => setOpMonitorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {opMonitorEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 pl-10">
                    {/* Polling Interval */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Polling Frequency
                      </label>
                      <select
                        value={opMonitorInterval}
                        onChange={(e) => setOpMonitorInterval(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value={30}>Every 30 Seconds (Fast)</option>
                        <option value={60}>Every 1 Minute (Recommended)</option>
                        <option value={120}>Every 2 Minutes</option>
                        <option value={300}>Every 5 Minutes (Low traffic)</option>
                      </select>
                    </div>

                    {/* Sound Settings & Chime Tester */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                          Ding-Dong Chime
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={testDingDongChime}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Test the Web Audio doorbell chime"
                          >
                            🔔 Play Chime
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={simulateSampleNewTicket}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Simulate receiving an actual new ticket (sound + toast + desktop popup)"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Sample New Ticket
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opMonitorSound}
                          onChange={(e) => setOpMonitorSound(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Play harmonic chime on new ticket
                        </span>
                      </label>
                    </div>

                    {/* Browser Notifications */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <BellRing className="w-3.5 h-3.5 text-indigo-500" />
                          Desktop Notifications
                        </label>
                        {notificationPermissionState !== 'granted' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const perm = await requestNotificationPermission();
                              setNotificationPermissionState(perm);
                            }}
                            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            Grant Permission
                          </button>
                        )}
                      </div>
                      <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opMonitorBrowserNotification}
                          onChange={(e) => setOpMonitorBrowserNotification(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Show native desktop popups
                        </span>
                      </label>
                    </div>

                    {/* Auto Sync Toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Automatic Matrix Sync
                      </label>
                      <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opMonitorAutoSync}
                          onChange={(e) => setOpMonitorAutoSync(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Auto-add to Matrix without prompt
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pomodoro Duration Settings */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Pomodoro Focus Timer
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Focus Interval (mins)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.pomodoro_work || 25}
                  onChange={(e) => updateSettings({ pomodoro_work: parseInt(e.target.value) || 25 })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Break Interval (mins)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.pomodoro_break || 5}
                  onChange={(e) => updateSettings({ pomodoro_break: parseInt(e.target.value) || 5 })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Project & Category Tags Manager */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Manage Project Tags
            </h4>

            <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {c.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      confirmAction({
                        title: 'Delete Category Tag',
                        message: `Are you sure you want to delete tag "${c.name}"?`,
                        confirmText: 'Delete Tag',
                        variant: 'danger',
                        onConfirm: () => deleteCategory(c.id),
                      });
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new project */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 cursor-pointer bg-transparent"
                title="Tag color"
              />
              <input
                type="text"
                placeholder="New project name (e.g. Marketing)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Add Tag
              </button>
            </form>
          </div>

          {/* Database Backup & Export */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              Data Persistence & Backup
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Your tasks and configurations are permanently stored in the local SQLite database. You can also export full JSON snapshots anytime.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export JSON Backup
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Restore JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            {exportStatus && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                {exportStatus}
              </p>
            )}
            {importStatus && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                {importStatus}
              </p>
            )}
          </div>

          {/* DANGER ZONE: Purge NexTask */}
          <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Danger Zone
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  Irreversible Action
                </span>
              </div>

              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                <b>Purge NexTask Tasks:</b> Clears all tasks, subtasks, and imported tags from NexTask. 
                <span className="underline ml-1 font-semibold">Your OpenProject credentials, host URL, theme, and timer configs are strictly preserved.</span>
              </p>

              {purgeMessage && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {purgeMessage}
                </div>
              )}

              {!isPurgeConfirming ? (
                <button
                  type="button"
                  onClick={() => setIsPurgeConfirming(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge NexTask Tasks</span>
                </button>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-300 dark:border-rose-700 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Are you absolutely sure you want to delete all tasks?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={purgeLoading}
                      onClick={async () => {
                        try {
                          setPurgeLoading(true);
                          setPurgeMessage(null);
                          await purgeAllTasks();
                          setPurgeMessage('Clariti tasks purged successfully. Configs preserved.');
                          setIsPurgeConfirming(false);
                          setTimeout(() => setPurgeMessage(null), 5000);
                        } catch (err) {
                          setPurgeMessage('Purge failed: ' + err.message);
                        } finally {
                          setPurgeLoading(false);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {purgeLoading ? 'Purging...' : 'Yes, Delete Everything'}
                    </button>
                    <button
                      type="button"
                      disabled={purgeLoading}
                      onClick={() => setIsPurgeConfirming(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
