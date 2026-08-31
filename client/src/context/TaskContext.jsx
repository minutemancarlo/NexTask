import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { playDingDongSound } from '../utils/sound';
import { showTicketNotification } from '../utils/notification';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(() => {
    const savedTheme = localStorage.getItem('clariti_theme');
    return {
      theme: savedTheme || 'dark',
      pomodoro_work: 25,
      pomodoro_break: 5,
    };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom In-App Confirmation Modal State (No native confirm/alert)
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmText, cancelText, variant, onConfirm }

  const confirmAction = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', onConfirm }) => {
    setConfirmDialog({
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm: () => {
        if (typeof onConfirm === 'function') onConfirm();
        setConfirmDialog(null);
      },
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // Real-Time / Periodic New Ticket Monitoring Queue State (Multiple notifications support)
  const [activeNewTicketAlerts, setActiveNewTicketAlerts] = useState([]);
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [lastMonitoredAt, setLastMonitoredAt] = useState(null);
  // Session-based tracking so unsynced new tickets are automatically captured on app start
  const [notifiedTicketIds, setNotifiedTicketIds] = useState(new Set());

  // Filters & Views
  const [activeView, setActiveView] = useState('matrix'); // 'matrix' | 'kanban' | 'list' | 'openproject'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState('');

  // Modals & Active Task
  const [editingTask, setEditingTask] = useState(null); // null, 'new', or task object
  const [defaultQuadrantForNew, setDefaultQuadrantForNew] = useState('Q1');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // OpenProject Sync Review Modal State
  const [isSyncReviewOpen, setIsSyncReviewOpen] = useState(false);
  const [syncReviewCandidates, setSyncReviewCandidates] = useState([]);
  const [syncReviewStats, setSyncReviewStats] = useState(null);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);

  // Active Pomodoro Task
  const [activeTimerTask, setActiveTimerTask] = useState(null);

  // Sync theme with HTML document element and localStorage immediately
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('clariti_theme', settings.theme);
  }, [settings.theme]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedCategories, fetchedSettings] = await Promise.all([
        api.getTasks(),
        api.getCategories(),
        api.getSettings(),
      ]);
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
      if (fetchedSettings && Object.keys(fetchedSettings).length > 0) {
        setSettings(prev => {
          const mergedTheme = fetchedSettings.theme || prev.theme;
          return { ...prev, ...fetchedSettings, theme: mergedTheme };
        });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load NexTask data:', err);
      setError('Could not connect to NexTask server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Task Actions (No subtasks)
  const createTask = async (taskData) => {
    try {
      const newTask = await api.createTask(taskData);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const updateTask = async (id, updates) => {
    try {
      // Optimistic update
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );
      const updated = await api.updateTask(id, updates);
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    } catch (err) {
      console.error('Error updating task:', err);
      fetchData(); // Rollback on error
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (activeTimerTask?.id === id) {
        setActiveTimerTask(null);
      }
      await api.deleteTask(id);
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchData();
      throw err;
    }
  };

  const moveTaskQuadrant = async (taskId, newQuadrant) => {
    await updateTask(taskId, { quadrant: newQuadrant });
  };

  const moveTaskStatus = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const incrementPomodoro = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newCount = (task.pomodoro_count || 0) + 1;
    await updateTask(taskId, { pomodoro_count: newCount });
  };

  // Category Actions
  const createCategory = async (catData) => {
    try {
      const newCat = await api.createCategory(catData);
      setCategories(prev => [...prev, newCat]);
      return newCat;
    } catch (err) {
      console.error('Error creating category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      setCategories(prev => prev.filter(c => c.id !== id));
      await api.deleteCategory(id);
    } catch (err) {
      console.error('Error deleting category:', err);
      fetchData();
    }
  };

  // Settings Actions
  const updateSettings = async (newSettings) => {
    try {
      setSettings(prev => ({ ...prev, ...newSettings }));
      await api.updateSettings(newSettings);
    } catch (err) {
      console.error('Error updating settings:', err);
      fetchData();
    }
  };

  // OpenProject Candidate Fetch & Review Launcher
  const openSyncReview = async (options = {}) => {
    try {
      setIsFetchingCandidates(true);
      setIsSyncReviewOpen(true);
      const res = await api.fetchOpenProjectCandidates({
        host: options.host || settings.openproject?.host,
        apiKey: options.apiKey || settings.openproject?.apiKey,
        mock: options.mock !== undefined ? options.mock : settings.openproject?.mock,
        projectId: options.projectId || settings.openproject?.projectId,
        allowedProjectIds: options.allowedProjectIds || settings.openproject?.allowedProjectIds,
        assigneeId: options.assigneeId || settings.openproject?.assigneeId,
        statusId: options.statusId || (options.statusIds && options.statusIds.length > 0 ? options.statusIds : settings.openproject?.statusIds?.length > 0 ? settings.openproject.statusIds : 'all'),
        statusOperator: options.statusOperator || settings.openproject?.statusOperator || '=',
        defaultQuadrant: options.defaultQuadrant || settings.openproject?.defaultQuadrant,
      });

      setSyncReviewCandidates(res.candidates || []);
      setSyncReviewStats(res.stats || null);
      return res;
    } catch (err) {
      console.error('Error fetching OpenProject candidates:', err);
      setIsSyncReviewOpen(false);
      throw err;
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  // Commit reviewed tickets to database
  const commitSyncReview = async (approvedTickets) => {
    try {
      const res = await api.syncOpenProjectTickets({ approvedTickets });
      await fetchData();
      setIsSyncReviewOpen(false);
      setSyncReviewCandidates([]);
      return res;
    } catch (err) {
      console.error('Error committing reviewed tickets:', err);
      throw err;
    }
  };

  // Reset monitoring notification memory
  const resetMonitoringHistory = () => {
    setNotifiedTicketIds(new Set());
    setActiveNewTicketAlerts([]);
    try {
      localStorage.removeItem('nextask_notified_tickets');
    } catch (e) {}
  };

  // Danger Zone Purge
  const purgeAllTasks = async () => {
    try {
      const res = await api.purgeNexTaskData();
      // Reset live monitor notification memory on purge so unsynced tickets are captured afresh
      resetMonitoringHistory();
      await fetchData();
      return res;
    } catch (err) {
      console.error('Error purging NexTask tasks:', err);
      throw err;
    }
  };

  // OpenProject Direct Sync helper (for direct background sync if needed)
  const syncOpenProject = async (options = {}) => {
    return openSyncReview(options);
  };

  // Quick sync single new ticket from live toast alert
  const quickSyncNewTicket = async (ticket, targetQuadrant) => {
    const quadrant = targetQuadrant || ticket.suggestedQuadrant || 'Q1';
    const approvedTicket = {
      ...ticket,
      title: ticket.subject || ticket.formattedTitle || `#${ticket.opId}`,
      delegatee: ticket.qaContact || ticket.delegatee || null,
      categoryId: ticket.suggestedCategoryId || ticket.categoryId || null,
      suggestedQuadrant: quadrant,
      suggestedStatus: 'todo',
      selectedForSync: true,
    };
    try {
      await commitSyncReview([approvedTicket]);
      dismissNewTicketAlert(ticket.opId);
    } catch (e) {
      console.error('Failed to quick sync new ticket:', e);
    }
  };

  const quickSyncAllNewTickets = async () => {
    if (activeNewTicketAlerts.length === 0) return;
    const approvedTickets = activeNewTicketAlerts.map(t => ({
      ...t,
      title: t.subject || t.formattedTitle || `#${t.opId}`,
      delegatee: t.qaContact || t.delegatee || null,
      categoryId: t.suggestedCategoryId || t.categoryId || null,
      suggestedQuadrant: t.suggestedQuadrant || 'Q1',
      suggestedStatus: 'todo',
      selectedForSync: true,
    }));
    try {
      await commitSyncReview(approvedTickets);
      setActiveNewTicketAlerts([]);
    } catch (e) {
      console.error('Failed to quick sync all new tickets:', e);
    }
  };

  const dismissNewTicketAlert = (opId) => {
    if (!opId) {
      setActiveNewTicketAlerts([]); // Dismiss all
    } else {
      setActiveNewTicketAlerts(prev => prev.filter(t => t.opId !== opId));
    }
  };

  const testDingDongChime = () => {
    playDingDongSound();
  };

  // Simulate a Sample New Ticket arrival (accumulates in activeNewTicketAlerts queue)
  const simulateSampleNewTicket = () => {
    const sampleId = Math.floor(50500 + Math.random() * 500);
    const sampleProjects = ['Axis Core Banking', 'SMADs Financial Services', 'Treasury & Risk Management', 'Digital Mobile Banking'];
    const sampleSeverities = ['Critical', 'Major', 'Normal'];
    const sampleSubjects = [
      'Customer Transaction Timeout on Peak Hour Settlement',
      'Real-Time Balance Verification Intermittent 504 Gateway',
      'Account Ledger Sync Mismatch during EOD Clearing Batch',
      'High Priority Audit Trail Logging Failure in Transfer Service',
      'OAuth2 Token Expiration on Multi-Factor Authentication',
      'Database Connection Pool Exhaustion on Report Generation',
    ];

    const randomSubject = sampleSubjects[Math.floor(Math.random() * sampleSubjects.length)];
    const randomProject = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];
    const randomSeverity = sampleSeverities[Math.floor(Math.random() * sampleSeverities.length)];

    const sampleTicket = {
      opId: sampleId,
      subject: randomSubject,
      title: randomSubject, // Set title strictly to Subject
      formattedTitle: `#${sampleId} - ${randomSubject}`,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      qaContact: 'Elena Rostova (Lead QA)',
      severity: randomSeverity,
      priorityTitle: randomSeverity === 'Critical' ? 'Immediate' : 'High',
      projectName: randomProject,
      ticketUrl: `${settings.openproject?.host || 'https://app.teligent.ph/openproject'}/work_packages/${sampleId}`,
      opStatusTitle: 'New',
      suggestedQuadrant: randomSeverity === 'Critical' ? 'Q1' : 'Q2',
      suggestedCategoryId: 'work',
      suggestedStatus: 'todo',
      createdAt: new Date().toISOString(),
    };

    // Play Ding-Dong chime sound
    playDingDongSound();

    // Trigger desktop notification
    showTicketNotification(sampleTicket, () => {
      setActiveView('matrix');
      openSyncReview({ projectId: sampleTicket.projectName });
    });

    // Accumulate in unseen ticket alerts queue (Newest first, without removing existing unseen ones)
    setActiveNewTicketAlerts(prev => {
      const existingIds = new Set(prev.map(t => t.opId));
      if (existingIds.has(sampleTicket.opId)) return prev;
      return [sampleTicket, ...prev];
    });
  };

  // Periodic Monitor for OpenProject New Tickets
  useEffect(() => {
    const opConfig = settings.openproject;
    const isConfigured = !!(opConfig?.mock || (opConfig?.host && opConfig?.apiKey));
    const isMonitorEnabled = opConfig?.monitorEnabled !== false; // Default true if configured

    if (!isConfigured || !isMonitorEnabled) {
      setIsMonitoringActive(false);
      return;
    }

    setIsMonitoringActive(true);
    const intervalSeconds = Math.max(15, parseInt(opConfig?.monitorInterval, 10) || 60);

    const checkNewTickets = async () => {
      try {
        const res = await api.pollNewOpenProjectTickets({
          host: opConfig.host,
          apiKey: opConfig.apiKey,
          mock: opConfig.mock,
          projectId: opConfig.projectId,
          assigneeId: opConfig.assigneeId || 'me',
        });

        setLastMonitoredAt(new Date().toISOString());

        if (res.success && Array.isArray(res.newTickets) && res.newTickets.length > 0) {
          // Find newly arrived tickets that are unsynced in tasks AND haven't been notified yet
          const syncedOpIds = new Set(tasks.filter(t => t.openproject_id).map(t => Number(t.openproject_id)));

          const unnotifiedTickets = res.newTickets.filter(
            ticket => !syncedOpIds.has(Number(ticket.opId)) && !notifiedTicketIds.has(Number(ticket.opId))
          );

          if (unnotifiedTickets.length > 0) {
            // Play Ding-Dong sound chime if sound enabled
            if (opConfig.monitorSound !== false) {
              playDingDongSound();
            }

            // Trigger Browser Desktop Notification if enabled
            if (opConfig.monitorBrowserNotification !== false) {
              unnotifiedTickets.forEach(ticket => {
                showTicketNotification(ticket, () => {
                  setActiveView('matrix');
                  openSyncReview({ projectId: ticket.projectName });
                });
              });
            }

            // Accumulate in unseen ticket alerts queue (newest first, preserving existing unseen ones)
            setActiveNewTicketAlerts(prev => {
              const existingIds = new Set(prev.map(t => t.opId));
              const additions = unnotifiedTickets.filter(t => !existingIds.has(t.opId));
              return [...additions, ...prev];
            });

            // If auto-sync is enabled in settings, auto-commit them directly
            if (opConfig.monitorAutoSync === true) {
              await commitSyncReview(unnotifiedTickets);
            }

            // Update notifiedTicketIds so we do not chime again for these tickets
            setNotifiedTicketIds(prev => {
              const updated = new Set(prev);
              unnotifiedTickets.forEach(t => updated.add(t.opId));
              try {
                localStorage.setItem('nextask_notified_tickets', JSON.stringify(Array.from(updated)));
              } catch (e) {}
              return updated;
            });
          }
        }
      } catch (pollErr) {
        console.warn('[NexTask Monitor] Background poll error:', pollErr.message);
      }
    };

    // Run initial check on startup / mount
    checkNewTickets();

    const intervalId = setInterval(checkNewTickets, intervalSeconds * 1000);
    return () => clearInterval(intervalId);
  }, [
    settings.openproject?.host,
    settings.openproject?.apiKey,
    settings.openproject?.mock,
    settings.openproject?.projectId,
    settings.openproject?.assigneeId,
    settings.openproject?.monitorEnabled,
    settings.openproject?.monitorInterval,
    settings.openproject?.monitorSound,
    settings.openproject?.monitorBrowserNotification,
    settings.openproject?.monitorAutoSync,
    notifiedTicketIds,
  ]);

  // Filtered Tasks helper (No subtasks)
  const filteredTasks = tasks.filter(task => {
    if (selectedQuadrantFilter && task.quadrant !== selectedQuadrantFilter) {
      return false;
    }
    if (selectedCategory && task.category_id !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchDelegatee = task.delegatee?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchDelegatee) {
        return false;
      }
    }
    return true;
  });

  return (
    <TaskContext.Provider
      value={{
        tasks,
        filteredTasks,
        categories,
        settings,
        loading,
        error,
        activeView,
        setActiveView,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedQuadrantFilter,
        setSelectedQuadrantFilter,
        editingTask,
        setEditingTask,
        defaultQuadrantForNew,
        setDefaultQuadrantForNew,
        isSettingsOpen,
        setIsSettingsOpen,
        activeTimerTask,
        setActiveTimerTask,
        createTask,
        updateTask,
        deleteTask,
        moveTaskQuadrant,
        moveTaskStatus,
        incrementPomodoro,
        createCategory,
        deleteCategory,
        updateSettings,
        syncOpenProject,
        isSyncReviewOpen,
        setIsSyncReviewOpen,
        syncReviewCandidates,
        syncReviewStats,
        isFetchingCandidates,
        openSyncReview,
        commitSyncReview,
        purgeAllTasks,
        refreshData: fetchData,
        // Confirmation Modal
        confirmDialog,
        confirmAction,
        closeConfirmDialog,
        // Live Monitoring & Sound
        activeNewTicketAlerts,
        activeNewTicketAlert: activeNewTicketAlerts.length > 0 ? { count: activeNewTicketAlerts.length, latestTicket: activeNewTicketAlerts[0], tickets: activeNewTicketAlerts } : null,
        quickSyncNewTicket,
        quickSyncAllNewTickets,
        dismissNewTicketAlert,
        testDingDongChime,
        simulateSampleNewTicket,
        resetMonitoringHistory,
        isMonitoringActive,
        lastMonitoredAt,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
