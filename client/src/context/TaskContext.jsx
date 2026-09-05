import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { playDingDongSound } from '../utils/sound';
import { showTicketNotification, showAssigneeChangeNotification, showServerDownNotification } from '../utils/notification';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(() => {
    const savedTheme = localStorage.getItem('nextask_theme');
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
  const [activeAssigneeAlerts, setActiveAssigneeAlerts] = useState([]);
  const [serverDownAlert, setServerDownAlert] = useState(null); // { failureCount, message, isPersistent, timestamp }
  const consecutiveFailuresRef = useRef(0);
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [lastMonitoredAt, setLastMonitoredAt] = useState(null);
  // Session-based tracking so unsynced new tickets and reassignments are captured without repeat spam
  const [notifiedTicketIds, setNotifiedTicketIds] = useState(() => {
    try {
      const saved = localStorage.getItem('nextask_notified_tickets');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [notifiedReassignmentKeys, setNotifiedReassignmentKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('nextask_notified_reassignments');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Filters & Views
  const [activeView, setActiveView] = useState('matrix'); // 'matrix' | 'kanban' | 'list' | 'openproject'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState(''); // '' | 'user' | 'openproject'

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
    localStorage.setItem('nextask_theme', settings.theme);
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
    setNotifiedReassignmentKeys(new Set());
    setActiveNewTicketAlerts([]);
    setActiveAssigneeAlerts([]);
    setServerDownAlert(null);
    consecutiveFailuresRef.current = 0;
    try {
      localStorage.removeItem('nextask_notified_tickets');
      localStorage.removeItem('nextask_notified_reassignments');
    } catch (e) {}
  };

  const dismissServerDownAlert = () => {
    setServerDownAlert(null);
  };

  // Simulate a Server Down event (failureCount: 1 = First detection, 3 = 3rd Retry Unreachable)
  const simulateSampleServerDown = (failureCount = 1) => {
    const errorMsg = failureCount >= 3
      ? 'HTTP 503 Gateway Timeout: OpenProject server unreachable after 3 retries'
      : 'HTTP 502 Bad Gateway: Unable to establish connection to OpenProject host';

    // Play Ding-Dong chime sound
    playDingDongSound();

    // Trigger desktop notification
    showServerDownNotification(failureCount, errorMsg, () => {
      setIsSettingsOpen(true);
    });

    // Set active server down alert
    setServerDownAlert({
      failureCount,
      message: errorMsg,
      isPersistent: failureCount >= 3,
      timestamp: new Date().toISOString(),
    });
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

  const dismissAssigneeAlert = (opId) => {
    if (!opId) {
      setActiveAssigneeAlerts([]); // Dismiss all
    } else {
      setActiveAssigneeAlerts(prev => prev.filter(t => t.opId !== opId));
    }
  };

  const keepReassignedTask = async (taskId, opId, newAssignee, newAssigneeId) => {
    try {
      if (taskId) {
        await updateTask(taskId, {
          openproject_assignee: newAssignee || 'Other Assignee',
          openproject_assignee_id: newAssigneeId || null,
        });
      }
      dismissAssigneeAlert(opId);
    } catch (e) {
      console.error('Failed to keep reassigned task:', e);
    }
  };

  const delegateReassignedTask = async (taskId, opId, newAssignee, newAssigneeId) => {
    try {
      if (taskId) {
        await updateTask(taskId, {
          quadrant: 'Q3',
          status: 'delegated',
          delegatee: newAssignee || 'Other Assignee',
          openproject_assignee: newAssignee || 'Other Assignee',
          openproject_assignee_id: newAssigneeId || null,
        });
      }
      dismissAssigneeAlert(opId);
    } catch (e) {
      console.error('Failed to delegate reassigned task:', e);
    }
  };

  const removeReassignedTask = async (taskId, opId) => {
    try {
      if (taskId) {
        await deleteTask(taskId);
      }
      dismissAssigneeAlert(opId);
    } catch (e) {
      console.error('Failed to remove reassigned task:', e);
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

  // Simulate an Assignee Change event (accumulates in activeAssigneeAlerts queue)
  const simulateSampleAssigneeChange = () => {
    // Pick an existing OpenProject task or generate realistic sample
    const existingOpTask = tasks.find(t => t.openproject_id);
    const sampleId = existingOpTask ? Number(existingOpTask.openproject_id) : Math.floor(50400 + Math.random() * 200);
    const sampleSubject = existingOpTask ? existingOpTask.title : 'Payment Gateway Double-Submit Reconciliation Handler';
    const sampleTaskId = existingOpTask ? existingOpTask.id : null;
    const sampleProject = existingOpTask?.category_name || 'Axis Core Banking';

    const assignees = ['Sarah Jenkins', 'Elena Rostova (Lead QA)', 'David Miller (DevOps)', 'Alexander Wright'];
    const randomNewAssignee = assignees[Math.floor(Math.random() * assignees.length)];

    const reassignmentItem = {
      taskId: sampleTaskId,
      opId: sampleId,
      subject: sampleSubject,
      formattedTitle: `#${sampleId} - ${sampleSubject}`,
      previousAssignee: existingOpTask?.openproject_assignee || 'You (Assigned User)',
      newAssignee: randomNewAssignee,
      newAssigneeId: String(Math.floor(2 + Math.random() * 10)),
      projectName: sampleProject,
      ticketUrl: `${settings.openproject?.host || 'https://app.teligent.ph/openproject'}/work_packages/${sampleId}`,
      reassignedAt: new Date().toISOString(),
    };

    // Play Ding-Dong chime sound
    playDingDongSound();

    // Trigger desktop notification
    showAssigneeChangeNotification(reassignmentItem, () => {
      setActiveView('matrix');
    });

    // Add to activeAssigneeAlerts
    setActiveAssigneeAlerts(prev => {
      const filtered = prev.filter(a => a.opId !== sampleId);
      return [reassignmentItem, ...filtered];
    });
  };

  // Periodic Monitor for OpenProject New Tickets, Reassigned Tickets & Server Down
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

    const checkMonitorEvents = async () => {
      try {
        const res = await api.pollNewOpenProjectTickets({
          host: opConfig.host,
          apiKey: opConfig.apiKey,
          mock: opConfig.mock,
          projectId: opConfig.projectId,
          assigneeId: opConfig.assigneeId || 'me',
        });

        setLastMonitoredAt(new Date().toISOString());

        if (res.success) {
          // Connection is healthy: reset consecutive failure tracking and clear server down alert
          if (consecutiveFailuresRef.current > 0) {
            consecutiveFailuresRef.current = 0;
            setServerDownAlert(null);
          }

          let soundTriggered = false;

          // 1. Process Unsynced New Tickets
          if (Array.isArray(res.newTickets) && res.newTickets.length > 0) {
            const syncedOpIds = new Set(tasks.filter(t => t.openproject_id).map(t => Number(t.openproject_id)));
            const unnotifiedTickets = res.newTickets.filter(
              ticket => !syncedOpIds.has(Number(ticket.opId)) && !notifiedTicketIds.has(Number(ticket.opId))
            );

            if (unnotifiedTickets.length > 0) {
              if (opConfig.monitorSound !== false && !soundTriggered) {
                playDingDongSound();
                soundTriggered = true;
              }

              if (opConfig.monitorBrowserNotification !== false) {
                unnotifiedTickets.forEach(ticket => {
                  showTicketNotification(ticket, () => {
                    setActiveView('matrix');
                    openSyncReview({ projectId: ticket.projectName });
                  });
                });
              }

              setActiveNewTicketAlerts(prev => {
                const existingIds = new Set(prev.map(t => t.opId));
                const additions = unnotifiedTickets.filter(t => !existingIds.has(t.opId));
                return [...additions, ...prev];
              });

              if (opConfig.monitorAutoSync === true) {
                await commitSyncReview(unnotifiedTickets);
              }

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

          // 2. Process Reassigned Tickets
          const isAssigneeMonitorEnabled = opConfig.monitorAssigneeChange !== false;
          if (isAssigneeMonitorEnabled && Array.isArray(res.reassignedTickets) && res.reassignedTickets.length > 0) {
            const unnotifiedReassignments = res.reassignedTickets.filter(
              item => !notifiedReassignmentKeys.has(`${item.opId}-${item.newAssignee}`)
            );

            if (unnotifiedReassignments.length > 0) {
              if (opConfig.monitorSound !== false && !soundTriggered) {
                playDingDongSound();
                soundTriggered = true;
              }

              if (opConfig.monitorBrowserNotification !== false) {
                unnotifiedReassignments.forEach(item => {
                  showAssigneeChangeNotification(item, () => {
                    setActiveView('matrix');
                  });
                });
              }

              setActiveAssigneeAlerts(prev => {
                const existingIds = new Set(prev.map(t => t.opId));
                const additions = unnotifiedReassignments.filter(t => !existingIds.has(t.opId));
                return [...additions, ...prev];
              });

              setNotifiedReassignmentKeys(prev => {
                const updated = new Set(prev);
                unnotifiedReassignments.forEach(t => updated.add(`${t.opId}-${t.newAssignee}`));
                try {
                  localStorage.setItem('nextask_notified_reassignments', JSON.stringify(Array.from(updated)));
                } catch (e) {}
                return updated;
              });
            }
          }
        }
      } catch (pollErr) {
        console.warn('[NexTask Monitor] Background poll error:', pollErr.message);
        
        // Track consecutive failures
        consecutiveFailuresRef.current += 1;
        const failureCount = consecutiveFailuresRef.current;

        // 1st failure: Notify once that OpenProject is Down
        if (failureCount === 1) {
          if (opConfig.monitorSound !== false) {
            playDingDongSound();
          }
          if (opConfig.monitorBrowserNotification !== false) {
            showServerDownNotification(1, pollErr.message, () => {
              setIsSettingsOpen(true);
            });
          }
          setServerDownAlert({
            failureCount: 1,
            message: pollErr.message || 'Connection to OpenProject failed',
            isPersistent: false,
            timestamp: new Date().toISOString(),
          });
        }
        // 3rd failure (after 3 retries): Notify again that OpenProject is unreachable
        else if (failureCount === 3) {
          if (opConfig.monitorSound !== false) {
            playDingDongSound();
          }
          if (opConfig.monitorBrowserNotification !== false) {
            showServerDownNotification(3, pollErr.message, () => {
              setIsSettingsOpen(true);
            });
          }
          setServerDownAlert({
            failureCount: 3,
            message: pollErr.message || 'OpenProject unreachable after 3 retries',
            isPersistent: true,
            timestamp: new Date().toISOString(),
          });
        }
        // Subsequent failures: keep counter updated
        else if (failureCount > 3) {
          setServerDownAlert(prev => prev ? { ...prev, failureCount } : {
            failureCount,
            message: pollErr.message || 'OpenProject unreachable',
            isPersistent: true,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    // Run initial check on startup / mount
    checkMonitorEvents();

    const intervalId = setInterval(checkMonitorEvents, intervalSeconds * 1000);
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
    settings.openproject?.monitorAssigneeChange,
    notifiedTicketIds,
    notifiedReassignmentKeys,
    tasks,
  ]);

  // Filtered Tasks helper (No subtasks)
  const filteredTasks = tasks.filter(task => {
    if (selectedQuadrantFilter && task.quadrant !== selectedQuadrantFilter) {
      return false;
    }
    if (selectedCategory && task.category_id !== selectedCategory) {
      return false;
    }
    if (selectedSourceFilter === 'user' && task.openproject_id) {
      return false;
    }
    if (selectedSourceFilter === 'openproject' && !task.openproject_id) {
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

  const totalAlertCount = activeNewTicketAlerts.length + activeAssigneeAlerts.length + (serverDownAlert ? 1 : 0);

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
        selectedSourceFilter,
        setSelectedSourceFilter,
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
        // Live Monitoring, Alerts & Sound
        activeNewTicketAlerts,
        activeAssigneeAlerts,
        serverDownAlert,
        totalAlertCount,
        activeNewTicketAlert: activeNewTicketAlerts.length > 0 ? { count: activeNewTicketAlerts.length, latestTicket: activeNewTicketAlerts[0], tickets: activeNewTicketAlerts } : null,
        quickSyncNewTicket,
        quickSyncAllNewTickets,
        dismissNewTicketAlert,
        dismissAssigneeAlert,
        dismissServerDownAlert,
        keepReassignedTask,
        delegateReassignedTask,
        removeReassignedTask,
        testDingDongChime,
        simulateSampleNewTicket,
        simulateSampleAssigneeChange,
        simulateSampleServerDown,
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
