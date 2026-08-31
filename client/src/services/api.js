const API_BASE = '/api';

export const api = {
  // Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.quadrant) query.append('quadrant', params.quadrant);
    if (params.status) query.append('status', params.status);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/tasks?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async getTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`);
    if (!res.ok) throw new Error('Failed to fetch task');
    return res.json();
  },

  async createTask(taskData) {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async updateTask(id, updates) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  async toggleSubtask(taskId, subtaskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to toggle subtask');
    return res.json();
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async createCategory(categoryData) {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },

  // Settings & Backups
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async exportData() {
    const res = await fetch(`${API_BASE}/settings/export`);
    if (!res.ok) throw new Error('Failed to export data');
    return res.json();
  },

  async importData(data) {
    const res = await fetch(`${API_BASE}/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import data');
    }
    return res.json();
  },

  // OpenProject Integration
  async testOpenProject(config) {
    const res = await fetch(`${API_BASE}/openproject/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Connection failed');
    return data;
  },

  async getOpenProjectProjects(params = {}) {
    const query = new URLSearchParams();
    if (params.host) query.append('host', params.host);
    if (params.apiKey) query.append('apiKey', params.apiKey);
    if (params.mock !== undefined) query.append('mock', params.mock);

    const res = await fetch(`${API_BASE}/openproject/projects?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch OpenProject projects');
    return data;
  },

  async getOpenProjectUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.host) query.append('host', params.host);
    if (params.apiKey) query.append('apiKey', params.apiKey);
    if (params.mock !== undefined) query.append('mock', params.mock);

    const res = await fetch(`${API_BASE}/openproject/users?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch OpenProject users');
    return data;
  },

  async importOpenProjectProjects(projects) {
    const res = await fetch(`${API_BASE}/openproject/import-projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to import projects');
    return data;
  },

  async fetchOpenProjectCandidates(options = {}) {
    const res = await fetch(`${API_BASE}/openproject/fetch-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch candidate tickets');
    return data;
  },

  async pollNewOpenProjectTickets(params = {}) {
    const query = new URLSearchParams();
    if (params.host) query.append('host', params.host);
    if (params.apiKey) query.append('apiKey', params.apiKey);
    if (params.mock !== undefined) query.append('mock', params.mock);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.assigneeId) query.append('assigneeId', params.assigneeId);

    const res = await fetch(`${API_BASE}/openproject/poll-new?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to poll new OpenProject tickets');
    return data;
  },

  async syncOpenProjectTickets(options = {}) {
    const res = await fetch(`${API_BASE}/openproject/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync OpenProject tickets');
    return data;
  },

  async getOpenProjectStatuses(params = {}) {
    const query = new URLSearchParams();
    if (params.host) query.append('host', params.host);
    if (params.apiKey) query.append('apiKey', params.apiKey);
    if (params.mock !== undefined) query.append('mock', params.mock);

    const res = await fetch(`${API_BASE}/openproject/statuses?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch OpenProject statuses');
    return data;
  },

  async getOpenProjectReportItems(filters = {}) {
    const res = await fetch(`${API_BASE}/openproject/report-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch report items');
    return data;
  },

  async exportOpenProjectReport(filters = {}) {
    const res = await fetch(`${API_BASE}/openproject/export-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate report');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openproject-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  },

  async purgeNexTaskData() {
    const res = await fetch(`${API_BASE}/settings/purge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to purge data');
    return data;
  },
};

