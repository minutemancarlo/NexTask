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
      let errMsg = 'Failed to generate OpenProject report';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        const text = await res.text().catch(() => '');
        errMsg = text.slice(0, 150) || `Server error (${res.status})`;
      }
      throw new Error(errMsg);
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

  async exportTasksExcelReport(filters = {}) {
    const res = await fetch(`${API_BASE}/tasks/export-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    if (!res.ok) {
      let errMsg = 'Failed to generate Tasks Excel report';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        const text = await res.text().catch(() => '');
        errMsg = text.slice(0, 150) || `Server error (${res.status})`;
      }
      throw new Error(errMsg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextask-tasks-report-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Notes & Memos
  async getNotes(params = {}) {
    const query = new URLSearchParams();
    if (params.filter) query.append('filter', params.filter);
    if (params.tag) query.append('tag', params.tag);
    if (params.search) query.append('search', params.search);
    if (params.date) query.append('date', params.date);

    const res = await fetch(`${API_BASE}/notes?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async getNoteTags() {
    const res = await fetch(`${API_BASE}/notes/tags`);
    if (!res.ok) throw new Error('Failed to fetch note tags');
    return res.json();
  },

  async getNoteStats() {
    const res = await fetch(`${API_BASE}/notes/stats`);
    if (!res.ok) throw new Error('Failed to fetch note stats');
    return res.json();
  },

  async createNote(noteData) {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },

  async updateNote(id, updates) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  async togglePinNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}/pin`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to toggle pin');
    return res.json();
  },

  async toggleArchiveNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}/archive`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to toggle archive');
    return res.json();
  },

  async deleteNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  async exportNotes(format = 'markdown') {
    const res = await fetch(`${API_BASE}/notes/export?format=${format}`);
    if (!res.ok) throw new Error('Failed to export notes');
    if (format === 'json') {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextask-notes-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } else {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextask-notes-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
  },

  async importNotes(payload) {
    const res = await fetch(`${API_BASE}/notes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to import notes');
    }
    return data;
  },
};



