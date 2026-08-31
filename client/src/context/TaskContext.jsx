import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

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

  // Danger Zone Purge
  const purgeAllTasks = async () => {
    try {
      const res = await api.purgeNexTaskData();
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
