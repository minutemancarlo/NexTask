const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

// Helper to get OpenProject settings from database
function getOpenProjectConfig() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openproject');
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Helper to construct basic auth headers
function getHeaders(apiKey) {
  const token = Buffer.from(`apikey:${apiKey}`).toString('base64');
  return {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// Clean and normalize OpenProject host URL
function normalizeHost(host) {
  let url = (host || '').trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

// Map Severity or Priority to Eisenhower Quadrant
function mapSeverityToQuadrant(severityTitle, priorityTitle) {
  const text = `${severityTitle || ''} ${priorityTitle || ''}`.toLowerCase();
  if (text.includes('critical') || text.includes('blocker') || text.includes('immediate') || text.includes('urgent') || text.includes('highest')) {
    return 'Q1'; // Do First
  }
  if (text.includes('major') || text.includes('high') || text.includes('normal') || text.includes('medium')) {
    return 'Q2'; // Schedule
  }
  if (text.includes('minor') || text.includes('low') || text.includes('trivial')) {
    return 'Q4'; // Eliminate / Low Priority
  }
  return 'Q2'; // Default
}

// Map OpenProject status title to Clariti status
// Clariti statuses: 'todo' | 'in_progress' | 'delegated' | 'completed'
function mapStatusToClariti(statusTitle) {
  const s = (statusTitle || '').toLowerCase().trim();
  if (s.includes('closed') || s.includes('resolved') || s.includes('completed') || s.includes('rejected') || s.includes('tested') || s.includes('deployed')) {
    return 'completed';
  }
  if (s.includes('in progress') || s.includes('in develop') || s.includes('working') || s.includes('active') || s.includes('qa retesting') || s.includes('developed')) {
    return 'in_progress';
  }
  if (s.includes('delegat') || s.includes('assign') || s.includes('waiting')) {
    return 'delegated';
  }
  // Default to 'todo' for New, Re-Opened, Specified, To be scheduled, Scheduled, Confirmed, etc.
  return 'todo';
}

// Helper to extract QA Contact from work package
function extractQAContact(wp) {
  if (wp._links?.customField20?.title) {
    return wp._links.customField20.title;
  }
  if (wp.customField20 && typeof wp.customField20 === 'string' && wp.customField20.trim()) {
    return wp.customField20.trim();
  }

  if (wp._links) {
    for (const [key, val] of Object.entries(wp._links)) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes('qa') || lowerKey.includes('tester')) && val?.title) {
        return val.title;
      }
    }
  }

  for (const [key, val] of Object.entries(wp)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('qa') || lowerKey.includes('tester')) {
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object' && val.title) return val.title;
      if (val && typeof val === 'object' && val.name) return val.name;
    }
  }

  if (wp._links?.responsible?.title) {
    return wp._links.responsible.title;
  }

  return null;
}

// Helper to extract Severity from work package
function extractSeverity(wp) {
  if (wp._links?.customField22?.title) {
    return wp._links.customField22.title;
  }
  if (wp.customField22 && typeof wp.customField22 === 'string' && wp.customField22.trim()) {
    return wp.customField22.trim();
  }

  if (wp._links) {
    for (const [key, val] of Object.entries(wp._links)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('severity') && val?.title) {
        return val.title;
      }
    }
  }

  for (const [key, val] of Object.entries(wp)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('severity')) {
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object' && val.title) return val.title;
    }
  }

  return wp._links?.priority?.title || null;
}

// Helper to get matching category ID or auto-create it if it doesn't exist
function matchOrCreateClaritiCategory(projectLink) {
  if (!projectLink) return null;
  const projectTitle = (projectLink.title || '').trim();
  if (!projectTitle) return null;

  const projectHref = projectLink.href || '';
  const projIdMatch = projectHref.match(/projects\/(\d+)/);
  const projId = projIdMatch ? projIdMatch[1] : '';

  const allCategories = db.prepare('SELECT id, name, color FROM categories').all();
  const lowerTitle = projectTitle.toLowerCase();

  // 1. Check exact ID match
  if (projId) {
    const foundById = allCategories.find(c => c.id === `op-${projId}` || c.id.endsWith(`-${projId}`));
    if (foundById) return foundById.id;
  }

  // 2. Check exact name match
  const foundByName = allCategories.find(c => c.name.toLowerCase() === lowerTitle);
  if (foundByName) return foundByName.id;

  // 3. Check partial name match
  const foundPartial = allCategories.find(c => 
    c.name.toLowerCase().includes(lowerTitle) || lowerTitle.includes(c.name.toLowerCase())
  );
  if (foundPartial) return foundPartial.id;

  // 4. If not found, AUTO-ADD the project into categories table
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];
  const catId = projId ? `op-${projId}` : `op-${crypto.randomUUID().slice(0, 8)}`;
  const color = colors[allCategories.length % colors.length];

  try {
    db.prepare(`
      INSERT INTO categories (id, name, color)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name
    `).run(catId, projectTitle, color);
    return catId;
  } catch (e) {
    console.error('Error auto-creating category tag for project:', projectTitle, e);
    return null;
  }
}

// POST /api/openproject/test
// Test connection to OpenProject server
router.post('/test', async (req, res) => {
  try {
    const { host, apiKey, mock = false } = req.body;

    if (mock) {
      return res.json({
        success: true,
        user: { name: 'Demo User (Mock Mode)', id: 1, email: 'demo@openproject.local' },
        message: 'Connected to mock OpenProject instance successfully'
      });
    }

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'Host URL and API Key are required' });
    }

    const cleanHost = normalizeHost(host);
    const apiUrl = `${cleanHost}/api/v3`;

    const fetchRes = await fetch(apiUrl, {
      method: 'GET',
      headers: getHeaders(apiKey),
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return res.status(fetchRes.status).json({
        error: `OpenProject returned status ${fetchRes.status}`,
        details: errText.slice(0, 300)
      });
    }

    const data = await fetchRes.json();
    const userName = data._links?.user?.title || data.user?.title || 'OpenProject User';

    res.json({
      success: true,
      user: { name: userName },
      instance: data.instanceName || cleanHost
    });
  } catch (error) {
    console.error('OpenProject test connection error:', error);
    res.status(500).json({ error: `Connection failed: ${error.message}` });
  }
});

// GET /api/openproject/users
// Fetch accessible users / assignees to allow user to pick an Assignee filter
router.get('/users', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.query.host || config?.host;
    const apiKey = req.query.apiKey || config?.apiKey;
    const mock = req.query.mock === 'true' || config?.mock === true;

    if (mock) {
      return res.json([
        { id: 'me', name: 'Assigned to Me (Current User)' },
        { id: '1', name: 'Michael Chen' },
        { id: '2', name: 'Sarah Jenkins' },
        { id: '3', name: 'David Miller' },
        { id: '4', name: 'DevOps Team' },
      ]);
    }

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'OpenProject is not configured.' });
    }

    const cleanHost = normalizeHost(host);

    // 1. Fetch current logged-in user profile
    let meName = 'Current User';
    try {
      const meRes = await fetch(`${cleanHost}/api/v3/users/me`, {
        method: 'GET',
        headers: getHeaders(apiKey),
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        meName = meData.name || `${meData.firstName || ''} ${meData.lastName || ''}`.trim() || meData.login;
      }
    } catch (e) {
      console.warn('Failed to resolve users/me:', e.message);
    }

    // 2. Fetch list of principals/users
    let apiUrl = `${cleanHost}/api/v3/principals?pageSize=100`;

    let fetchRes = await fetch(apiUrl, {
      method: 'GET',
      headers: getHeaders(apiKey),
    });

    if (!fetchRes.ok) {
      apiUrl = `${cleanHost}/api/v3/users?pageSize=100`;
      fetchRes = await fetch(apiUrl, {
        method: 'GET',
        headers: getHeaders(apiKey),
      });
    }

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `Failed to fetch users (HTTP ${fetchRes.status})` });
    }

    const data = await fetchRes.json();
    const otherUsers = (data._embedded?.elements || [])
      .map(u => ({
        id: String(u.id),
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.login,
      }))
      .filter(u => u.name !== meName);

    const users = [
      { id: 'me', name: `Assigned to Me (${meName})` },
      ...otherUsers
    ];

    res.json(users);
  } catch (error) {
    console.error('Error fetching OpenProject users:', error);
    res.status(500).json({ error: `Failed to fetch users: ${error.message}` });
  }
});

// GET /api/openproject/projects
// Fetch accessible projects from OpenProject
router.get('/projects', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.query.host || config?.host;
    const apiKey = req.query.apiKey || config?.apiKey;
    const mock = req.query.mock === 'true' || config?.mock === true;

    if (mock) {
      return res.json([
        { id: 'mock-p1', identifier: 'software-dev', name: 'Software Development Core' },
        { id: 'mock-p2', identifier: 'operations-infra', name: 'Operations & Infrastructure' },
        { id: 'mock-p3', identifier: 'marketing-launch', name: 'Product Marketing Q3' },
      ]);
    }

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'OpenProject is not configured. Please enter host and API key.' });
    }

    const cleanHost = normalizeHost(host);
    const apiUrl = `${cleanHost}/api/v3/projects?pageSize=100`;

    const fetchRes = await fetch(apiUrl, {
      method: 'GET',
      headers: getHeaders(apiKey),
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `Failed to fetch projects (HTTP ${fetchRes.status})` });
    }

    const data = await fetchRes.json();
    const projects = (data._embedded?.elements || []).map(p => ({
      id: p.id,
      identifier: p.identifier,
      name: p.name,
      description: p.description?.raw || '',
    }));

    res.json(projects);
  } catch (error) {
    console.error('Error fetching OpenProject projects:', error);
    res.status(500).json({ error: `Failed to fetch projects: ${error.message}` });
  }
});

// POST /api/openproject/import-projects
// Import selected OpenProject projects as Clariti Category Tags
router.post('/import-projects', (req, res) => {
  try {
    const { projects } = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({ error: 'No projects provided to import' });
    }

    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, color)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name
    `);

    let importedCount = 0;
    db.exec('BEGIN');
    try {
      projects.forEach((p, idx) => {
        const catId = `op-${p.identifier || p.id}`;
        const color = colors[idx % colors.length];
        insertCat.run(catId, p.name, color);
        importedCount++;
      });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ success: true, count: importedCount });
  } catch (error) {
    console.error('Error importing OpenProject categories:', error);
    res.status(500).json({ error: 'Failed to import projects as tags' });
  }
});

// Helper to build OpenProject v3 status filter object
function buildStatusFilter(statusParam, operatorParam) {
  const op = operatorParam === '!' || operatorParam === 'is_not' ? '!' : '=';

  // If array of IDs provided: e.g. ['1', '7', '16']
  if (Array.isArray(statusParam) && statusParam.length > 0) {
    const ids = statusParam.map(String).filter(Boolean);
    if (ids.length > 0) {
      return { status: { operator: op, values: ids } };
    }
  }

  // If single string ID or comma-separated list
  if (typeof statusParam === 'string' && statusParam.trim() && statusParam !== 'all') {
    const raw = statusParam.trim();
    if (raw === 'open') {
      return op === '!' 
        ? { status_id: { operator: 'c', values: [] } } 
        : { status_id: { operator: 'o', values: [] } };
    }
    if (raw === 'closed') {
      return op === '!' 
        ? { status_id: { operator: 'o', values: [] } } 
        : { status_id: { operator: 'c', values: [] } };
    }

    const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      return { status: { operator: op, values: ids } };
    }
  }

  // Default fallback when operator is '=': New (1), In Progress (7), Re-Opened (16, 42, 43)
  if (op === '=') {
    return { status: { operator: '=', values: ['1', '7', '16', '42', '43'] } };
  }
  return null;
}

// Helper to query OpenProject raw work packages
async function fetchRawWorkPackages({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator = '=', mock }) {
  if (mock) {
    const allMockPackages = [
      {
        id: 201,
        subject: 'Payment Gateway Race Condition on Double Submit',
        _links: {
          priority: { title: 'Immediate' },
          status: { title: 'In Progress', id: '7' },
          assignee: { title: 'Michael Chen', id: '1' },
          qaContact: { title: 'Elena Rostova (QA Lead)' },
          project: { title: 'Software Development Core', href: '/openproject/api/v3/projects/mock-p1' }
        },
        severity: 'Critical',
      },
      {
        id: 202,
        subject: 'Refactor Authentication Middleware for OAuth2 Providers',
        _links: {
          priority: { title: 'High' },
          status: { title: 'New', id: '1' },
          assignee: { title: 'Michael Chen', id: '1' },
          qaContact: { title: 'Marcus Bell (QA Engineer)' },
          project: { title: 'Software Development Core', href: '/openproject/api/v3/projects/mock-p1' }
        },
        severity: 'Major',
      },
      {
        id: 203,
        subject: 'Fix Session Token Expiration Bug on Mobile Safari',
        _links: {
          priority: { title: 'High' },
          status: { title: 'Re-Opened', id: '16' },
          assignee: { title: 'Sarah Jenkins', id: '2' },
          qaContact: { title: 'Elena Rostova (QA Lead)' },
          project: { title: 'Operations & Infrastructure', href: '/openproject/api/v3/projects/mock-p2' }
        },
        severity: 'Major',
      },
      {
        id: 204,
        subject: 'Deprecated Typography Warnings in Legacy CSS Bundle',
        _links: {
          priority: { title: 'Low' },
          status: { title: 'New', id: '1' },
          assignee: { title: 'David Miller', id: '3' },
          qaContact: { title: 'Chloe Vance (QA)' },
          project: { title: 'Product Marketing Q3', href: '/openproject/api/v3/projects/mock-p3' }
        },
        severity: 'Minor',
      },
      {
        id: 205,
        subject: 'Historical Archived Migration Bug',
        _links: {
          priority: { title: 'Normal' },
          status: { title: 'Closed', id: '13' },
          assignee: { title: 'Michael Chen', id: '1' },
          qaContact: { title: 'Elena Rostova' },
          project: { title: 'Software Development Core', href: '/openproject/api/v3/projects/mock-p1' }
        },
        severity: 'Normal',
      }
    ];

    let result = allMockPackages;

    // Filter by allowed projects in mock
    if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0 && (!projectId || projectId === 'all')) {
      const allowedSet = new Set(allowedProjectIds.map(String));
      result = result.filter(wp => {
        const pId = wp._links?.project?.href?.split('/').pop();
        return allowedSet.has(pId);
      });
    }

    if (assigneeId && assigneeId !== 'all') {
      if (assigneeId === 'me') {
        result = result.filter(wp => wp._links?.assignee?.id === '1');
      } else {
        result = result.filter(wp => wp._links?.assignee?.id === String(assigneeId));
      }
    }

    const op = statusOperator === '!' || statusOperator === 'is_not' ? '!' : '=';
    let targetIds = [];
    if (Array.isArray(statusId)) {
      targetIds = statusId.map(String);
    } else if (typeof statusId === 'string' && statusId !== 'all') {
      targetIds = statusId.split(',').map(s => s.trim());
    }

    if (targetIds.length > 0) {
      if (op === '=') {
        result = result.filter(wp => targetIds.includes(String(wp._links?.status?.id)));
      } else {
        result = result.filter(wp => !targetIds.includes(String(wp._links?.status?.id)));
      }
    }
    return result;
  }

  if (!host || !apiKey) {
    throw new Error('OpenProject host and API key must be configured');
  }

  const cleanHost = normalizeHost(host);
  let baseUrl = `${cleanHost}/api/v3/work_packages?pageSize=200`;
  if (projectId && projectId !== 'all') {
    baseUrl = `${cleanHost}/api/v3/projects/${projectId}/work_packages?pageSize=200`;
  }

  const filters = [];

  // If allowedProjectIds are configured, strictly enforce them
  if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0) {
    const allowedStrings = allowedProjectIds.map(String);
    if (projectId && projectId !== 'all') {
      // If requested single project is not in allowed list, return empty
      if (!allowedStrings.includes(String(projectId))) {
        return [];
      }
    } else {
      // If targeting all projects, restrict query to allowed projects
      filters.push({ project: { operator: '=', values: allowedStrings } });
    }
  }

  // Build Status Filter using multi-select & operator
  const statusFilterObj = buildStatusFilter(statusId, statusOperator);
  if (statusFilterObj) {
    filters.push(statusFilterObj);
  }

  if (assigneeId && assigneeId !== 'all') {
    filters.push({ assignee: { operator: '=', values: [String(assigneeId)] } });
  }

  let fetchUrl = baseUrl;
  if (filters.length > 0) {
    const encodedFilters = encodeURIComponent(JSON.stringify(filters));
    fetchUrl += `&filters=${encodedFilters}`;
  }

  const fetchRes = await fetch(fetchUrl, {
    method: 'GET',
    headers: getHeaders(apiKey),
  });

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch work packages (HTTP ${fetchRes.status})`);
  }

  const data = await fetchRes.json();
  return data._embedded?.elements || [];
}

// POST /api/openproject/fetch-candidates
// Fetches tickets, cross-references with SQLite tasks, compares OpenProject vs App status,
// and returns rich candidates for user review before syncing.
router.post('/fetch-candidates', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.body.host || config?.host;
    const apiKey = req.body.apiKey || config?.apiKey;
    const projectId = req.body.projectId || config?.projectId;
    
    // Resolve allowedProjectIds: body -> config.allowedProjectIds -> fallback to config.projectId
    let rawAllowed = req.body.allowedProjectIds;
    if (!rawAllowed || !Array.isArray(rawAllowed) || rawAllowed.length === 0) {
      rawAllowed = config?.allowedProjectIds;
    }
    const allowedProjectIds = (Array.isArray(rawAllowed) && rawAllowed.length > 0)
      ? rawAllowed.map(String)
      : (config?.projectId && config.projectId !== 'all')
      ? [String(config.projectId)]
      : [];

    // Default to 'me' (currently logged in user) as requested
    const assigneeId = req.body.assigneeId || config?.assigneeId || 'me';
    const statusId = req.body.statusId || config?.statusId || 'all';
    const statusOperator = req.body.statusOperator || config?.statusOperator || '=';
    const mock = req.body.mock === true || config?.mock === true;
    const defaultQuadrant = req.body.defaultQuadrant || config?.defaultQuadrant || null;

    const workPackages = await fetchRawWorkPackages({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator, mock });
    const cleanHost = normalizeHost(host || 'https://openproject.local');

    // Retrieve all existing categories and existing OpenProject tasks from DB
    const existingTasks = db.prepare(`
      SELECT t.id, t.title, t.quadrant, t.status, t.category_id, t.delegatee, t.severity, t.openproject_id,
             c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.openproject_id IS NOT NULL
    `).all();

    const existingMap = new Map();
    existingTasks.forEach(task => {
      existingMap.set(Number(task.openproject_id), task);
    });

    const candidates = [];
    let newCount = 0;
    let syncedCount = 0;
    let mismatchCount = 0;

    for (const wp of workPackages) {
      const opStatusTitle = wp._links?.status?.title || 'Unknown';
      const opMappedStatus = mapStatusToClariti(opStatusTitle);

      // Only include New, Re-Opened, In Progress
      if (!opMappedStatus) continue;

      const opId = Number(wp.id);
      const subject = wp.subject || 'Work Package';
      const formattedTitle = `#${opId} - ${subject}`;
      const dueDate = wp.dueDate || null;
      const qaContact = extractQAContact(wp);
      const severity = extractSeverity(wp);
      const priorityTitle = wp._links?.priority?.title || '';
      const projectName = wp._links?.project?.title || '';
      const ticketUrl = `${cleanHost}/work_packages/${opId}`;

      // Auto-match or Auto-create project tag in categories table
      const matchedCategoryId = matchOrCreateClaritiCategory(wp._links?.project);
      const calculatedQuadrant = defaultQuadrant || mapSeverityToQuadrant(severity, priorityTitle);

      const existing = existingMap.get(opId);
      const isSynced = !!existing;

      let hasStatusMismatch = false;
      let statusDiff = null;

      if (isSynced) {
        syncedCount++;
        // Compare existing app status vs mapped openproject status
        if (existing.status !== opMappedStatus) {
          hasStatusMismatch = true;
          mismatchCount++;
          statusDiff = {
            appStatus: existing.status,
            opStatus: opMappedStatus,
            opStatusTitle: opStatusTitle
          };
        }
      } else {
        newCount++;
      }

      candidates.push({
        opId,
        subject,
        formattedTitle,
        dueDate,
        qaContact,
        severity,
        priorityTitle,
        projectName,
        ticketUrl,
        opStatusTitle,
        opMappedStatus,
        isSynced,
        existingTask: existing || null,
        hasStatusMismatch,
        statusDiff,
        suggestedQuadrant: existing ? existing.quadrant : calculatedQuadrant,
        suggestedStatus: existing ? existing.status : opMappedStatus,
        suggestedCategoryId: existing ? existing.category_id : matchedCategoryId,
        selectedForSync: true, // Default checked in review
      });
    }

    res.json({
      success: true,
      candidates,
      stats: {
        totalFound: candidates.length,
        newCount,
        syncedCount,
        mismatchCount,
      }
    });
  } catch (error) {
    console.error('Error fetching OpenProject candidates:', error);
    res.status(500).json({ error: `Candidate fetch failed: ${error.message}` });
  }
});

// GET /api/openproject/poll-new
// Lightweight periodic check for tickets with status = 'New' that haven't been synced to SQLite yet.
router.get('/poll-new', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.query.host || config?.host;
    const apiKey = req.query.apiKey || config?.apiKey;
    const mock = req.query.mock === 'true' || config?.mock === true;

    if (!mock && (!host || !apiKey)) {
      return res.json({ success: true, active: false, newTickets: [] });
    }

    const projectId = req.query.projectId || config?.projectId;
    const allowedProjectIds = config?.allowedProjectIds || [];
    const assigneeId = req.query.assigneeId || config?.assigneeId || 'me';

    // Status is strictly 'New' (ID 1 in standard OpenProject schemas)
    const workPackages = await fetchRawWorkPackages({
      host,
      apiKey,
      projectId,
      allowedProjectIds,
      assigneeId,
      statusId: ['1'], // Filter specifically for New
      statusOperator: '=',
      mock
    });

    const cleanHost = normalizeHost(host || 'https://openproject.local');

    // Get all existing openproject_ids already synced to SQLite
    const existingRows = db.prepare('SELECT openproject_id FROM tasks WHERE openproject_id IS NOT NULL').all();
    const existingIdSet = new Set(existingRows.map(r => Number(r.openproject_id)));

    const unsyncedNewTickets = [];
    for (const wp of workPackages) {
      const opId = Number(wp.id);
      const statusTitle = wp._links?.status?.title || 'New';
      const statusHref = wp._links?.status?.href || '';
      const statusIdFromHref = statusHref.split('/').pop() || '';
      const isNewStatus = statusTitle.toLowerCase().includes('new') || statusIdFromHref === '1' || String(wp._links?.status?.id || '') === '1';

      if (isNewStatus && !existingIdSet.has(opId)) {
        const severity = extractSeverity(wp);
        const priorityTitle = wp._links?.priority?.title || '';
        const suggestedQuadrant = config?.defaultQuadrant || mapSeverityToQuadrant(severity, priorityTitle);
        const suggestedCategoryId = matchOrCreateClaritiCategory(wp._links?.project);

        unsyncedNewTickets.push({
          opId,
          subject: wp.subject || 'New Work Package',
          formattedTitle: `#${opId} - ${wp.subject || 'Work Package'}`,
          dueDate: wp.dueDate || null,
          qaContact: extractQAContact(wp),
          severity,
          priorityTitle,
          projectName: wp._links?.project?.title || '',
          ticketUrl: `${cleanHost}/work_packages/${opId}`,
          opStatusTitle: statusTitle,
          suggestedQuadrant,
          suggestedCategoryId,
          suggestedStatus: 'todo',
          createdAt: wp.createdAt || new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      active: true,
      count: unsyncedNewTickets.length,
      newTickets: unsyncedNewTickets,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error polling new tickets from OpenProject:', error);
    res.status(500).json({ error: `Polling failed: ${error.message}` });
  }
});

// POST /api/openproject/sync
// Commits confirmed and reviewed tickets to SQLite
router.post('/sync', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.body.host || config?.host;
    const apiKey = req.body.apiKey || config?.apiKey;
    const projectId = req.body.projectId || config?.projectId;
    const allowedProjectIds = req.body.allowedProjectIds || config?.allowedProjectIds || [];
    // Default to 'me' as requested
    const assigneeId = req.body.assigneeId || config?.assigneeId || 'me';
    const statusId = req.body.statusId || config?.statusId || 'all';
    const statusOperator = req.body.statusOperator || config?.statusOperator || '=';
    const mock = req.body.mock === true || config?.mock === true;
    const defaultQuadrant = req.body.defaultQuadrant || config?.defaultQuadrant || null;

    let ticketsToSync = [];

    // If frontend passed an array of approved and reviewed tickets from the SyncReviewModal
    if (Array.isArray(req.body.approvedTickets)) {
      ticketsToSync = req.body.approvedTickets;
    } else {
      // Direct sync fallback: Fetch raw candidates directly
      const workPackages = await fetchRawWorkPackages({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator, mock });
      const cleanHost = normalizeHost(host || 'https://openproject.local');

      ticketsToSync = workPackages.map(wp => {
        const opId = Number(wp.id);
        const opStatusTitle = wp._links?.status?.title || '';
        const mappedStatus = mapStatusToClariti(opStatusTitle);
        if (!mappedStatus) return null;

        const qaContact = extractQAContact(wp);
        const severity = extractSeverity(wp);
        const priorityTitle = wp._links?.priority?.title || '';
        const calculatedQuadrant = defaultQuadrant || mapSeverityToQuadrant(severity, priorityTitle);
        const categoryId = matchOrCreateClaritiCategory(wp._links?.project);

        return {
          opId,
          subject: wp.subject,
          title: wp.subject || 'Work Package',
          quadrant: calculatedQuadrant,
          status: mappedStatus,
          dueDate: wp.dueDate || null,
          delegatee: qaContact,
          severity,
          categoryId,
          ticketUrl: `${cleanHost}/work_packages/${opId}`
        };
      }).filter(Boolean);
    }

    let inserted = 0;
    let updated = 0;

    const findExisting = db.prepare('SELECT id, quadrant, status, category_id FROM tasks WHERE openproject_id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO tasks (id, title, description, quadrant, status, due_date, category_id, delegatee, severity, openproject_id, openproject_url, pomodoro_count)
      VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = '', quadrant = ?, status = ?, due_date = ?, category_id = ?,
          delegatee = ?, severity = ?, openproject_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    db.exec('BEGIN');
    try {
      for (const t of ticketsToSync) {
        const opId = Number(t.opId);
        const title = t.subject || t.title || `#${opId}`;
        const quadrant = t.quadrant || 'Q2';
        const status = t.status || 'todo';
        const dueDate = t.dueDate || null;
        const categoryId = t.categoryId || null;
        const delegatee = t.delegatee || null;
        const severity = t.severity || null;
        const ticketUrl = t.ticketUrl || null;

        const existing = findExisting.get(opId);
        if (existing) {
          updateStmt.run(
            title,
            quadrant,
            status,
            dueDate,
            categoryId,
            delegatee,
            severity,
            ticketUrl,
            existing.id
          );
          updated++;
        } else {
          const newTaskId = 'task-op-' + opId;
          insertStmt.run(
            newTaskId,
            title,
            quadrant,
            status,
            dueDate,
            categoryId,
            delegatee,
            severity,
            opId,
            ticketUrl
          );
          inserted++;
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      totalSynced: ticketsToSync.length,
      inserted,
      updated
    });
  } catch (error) {
    console.error('Error committing OpenProject tickets:', error);
    res.status(500).json({ error: `Sync failed: ${error.message}` });
  }
});

// GET /api/openproject/statuses
// Fetch statuses for report filtering
router.get('/statuses', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.query.host || config?.host;
    const apiKey = req.query.apiKey || config?.apiKey;
    const mock = req.query.mock === 'true' || config?.mock === true;

    if (mock) {
      return res.json([
        { id: 'all', name: 'All Statuses' },
        { id: 'open', name: 'Open Statuses (New, In Progress, Re-Opened)' },
        { id: '1', name: 'New' },
        { id: '7', name: 'In progress' },
        { id: '16', name: 'Re-Opened' },
        { id: '8', name: 'Developed' },
        { id: '12', name: 'Closed' },
      ]);
    }

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'OpenProject is not configured.' });
    }

    const cleanHost = normalizeHost(host);
    const fetchRes = await fetch(`${cleanHost}/api/v3/statuses`, {
      method: 'GET',
      headers: getHeaders(apiKey),
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `Failed to fetch statuses (HTTP ${fetchRes.status})` });
    }

    const data = await fetchRes.json();
    const statuses = (data._embedded?.elements || []).map(s => ({
      id: String(s.id),
      name: s.name,
      isClosed: s.isClosed
    }));

    res.json(statuses);
  } catch (error) {
    console.error('Error fetching OpenProject statuses:', error);
    res.status(500).json({ error: `Failed to fetch statuses: ${error.message}` });
  }
});

// Helper to extract text from custom fields or raw markdown
function extractCustomFieldText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.replace(/<[^>]*>/g, '').trim();
  if (typeof val === 'object') {
    if (val.raw) return String(val.raw).replace(/<[^>]*>/g, '').trim();
    if (val.html) return String(val.html).replace(/<[^>]*>/g, '').trim();
    if (val.title) return String(val.title).trim();
  }
  return '';
}

// POST /api/openproject/export-report
// Extracts reports from OpenProject in Excel with headings:
// ID, Type, Subject, Root Cause, Resolution
// Helper function to extract and format report items from OpenProject work packages or mock
async function getReportItemsList({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator, mock }) {
  let items = [];

  if (mock) {
    const allMockItems = [
      {
        id: 50472,
        type: 'Bug',
        subject: 'Cosmetic Display of Values not Aligned in QA Environment',
        rootCause: 'CSS flexbox property inheritance misaligned during stylesheet bundle minimization.',
        resolution: 'Applied explicit text-align and min-width to table data cells in template.',
        status: 'New',
        statusId: '1',
        assignee: 'Carlo Boado',
        project: 'AXIS 2.2 Release 3',
        projectId: 'mock-p1',
      },
      {
        id: 50477,
        type: 'Issue',
        subject: 'New Approved Default FTP Rates - Columns too wide',
        rootCause: 'DataGrid auto-column sizing rule defaulted to 350px when min-width was missing.',
        resolution: 'Adjusted default column width to 140px and enabled horizontal scroll.',
        status: 'In progress',
        statusId: '7',
        assignee: 'Carlo Boado',
        project: 'AXIS 2.2 Release 3',
        projectId: 'mock-p1',
      },
      {
        id: 50495,
        type: 'Bug',
        subject: 'FTP Simulator - View Comparison - bps should be in red font if negative',
        rootCause: 'Negative number condition checked `< 0` on formatted string instead of numeric delta.',
        resolution: 'Converted string representation to parseFloat before evaluating color style.',
        status: 'Developed',
        statusId: '8',
        assignee: 'Carlo Boado',
        project: 'AXIS 2.2 Release 2 and 3',
        projectId: 'mock-p2',
      },
      {
        id: 50498,
        type: 'Issue',
        subject: 'FTP Simulator - View Comparison - Save and Export function does not work',
        rootCause: 'Export endpoint payload lacked CSRF header in production environment.',
        resolution: 'Added CSRF token header to fetch call before triggering spreadsheet download.',
        status: 'New',
        statusId: '1',
        assignee: 'Carlo Boado',
        project: 'AXIS 2.2 Release 2 and 3',
        projectId: 'mock-p2',
      }
    ];

    items = allMockItems;

    // Filter by allowed projects in mock
    if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0 && (!projectId || projectId === 'all')) {
      const allowedSet = new Set(allowedProjectIds.map(String));
      items = items.filter(it => allowedSet.has(String(it.projectId)));
    }

    const op = statusOperator === '!' || statusOperator === 'is_not' ? '!' : '=';
    let targetIds = [];
    if (Array.isArray(statusId)) {
      targetIds = statusId.map(String);
    } else if (typeof statusId === 'string' && statusId !== 'all') {
      targetIds = statusId.split(',').map(s => s.trim());
    }

    if (targetIds.length > 0) {
      if (op === '=') {
        items = items.filter(it => targetIds.includes(String(it.statusId)));
      } else {
        items = items.filter(it => !targetIds.includes(String(it.statusId)));
      }
    }
    return items;
  }

  if (!host || !apiKey) {
    throw new Error('OpenProject is not configured.');
  }

  const cleanHost = normalizeHost(host);
  let baseUrl = `${cleanHost}/api/v3/work_packages?pageSize=500`;
  if (projectId && projectId !== 'all') {
    baseUrl = `${cleanHost}/api/v3/projects/${projectId}/work_packages?pageSize=500`;
  }

  const filters = [];

  // If allowedProjectIds are configured, strictly enforce them
  if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0) {
    const allowedStrings = allowedProjectIds.map(String);
    if (projectId && projectId !== 'all') {
      // If requested single project is not in allowed list, return empty
      if (!allowedStrings.includes(String(projectId))) {
        return [];
      }
    } else {
      // When targeting all projects, restrict query to allowed projects
      filters.push({ project: { operator: '=', values: allowedStrings } });
    }
  }

  // Filter by Assignee
  if (assigneeId && assigneeId !== 'all') {
    filters.push({ assignee: { operator: '=', values: [String(assigneeId)] } });
  }

  // Filter by Status with Multi-Select and IS / IS NOT conditions
  const statusFilterObj = buildStatusFilter(statusId, statusOperator);
  if (statusFilterObj) {
    filters.push(statusFilterObj);
  }

  let fetchUrl = baseUrl;
  if (filters.length > 0) {
    const encoded = encodeURIComponent(JSON.stringify(filters));
    fetchUrl += `&filters=${encoded}`;
  }

  const fetchRes = await fetch(fetchUrl, {
    method: 'GET',
    headers: getHeaders(apiKey),
  });

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch OpenProject work packages (HTTP ${fetchRes.status})`);
  }

  const data = await fetchRes.json();
  const elements = data._embedded?.elements || [];

  items = elements.map(wp => {
    const id = wp.id;
    const type = wp._links?.type?.title || 'Issue';
    const subject = wp.subject || '';

    // Root Cause: customField33 (Root Cause c/o Dev in AXIS instances) or matching
    let rootCause = extractCustomFieldText(wp.customField33);
    if (!rootCause) {
      for (const [k, v] of Object.entries(wp)) {
        if (k.toLowerCase().includes('rootcause') || k.toLowerCase().includes('root_cause')) {
          rootCause = extractCustomFieldText(v);
          if (rootCause) break;
        }
      }
    }

    // Resolution: customField34 (Resolution c/o Dev in AXIS instances) or matching
    let resolution = extractCustomFieldText(wp.customField34);
    if (!resolution) {
      for (const [k, v] of Object.entries(wp)) {
        if (k.toLowerCase().includes('resolution')) {
          resolution = extractCustomFieldText(v);
          if (resolution) break;
        }
      }
    }

    const status = wp._links?.status?.title || '';
    const statusIdVal = wp._links?.status?.href ? wp._links.status.href.split('/').pop() : '';
    const assignee = wp._links?.assignee?.title || '';
    const project = wp._links?.project?.title || '';

    return {
      id,
      type,
      subject,
      rootCause,
      resolution,
      status,
      statusId: statusIdVal,
      assignee,
      project
    };
  });

  return items;
}

// POST /api/openproject/report-items
// Returns JSON array of report extraction items for the dashboard preview table
router.post('/report-items', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.body.host || config?.host;
    const apiKey = req.body.apiKey || config?.apiKey;
    const projectId = req.body.projectId || 'all';
    
    // Resolve allowedProjectIds: body -> config.allowedProjectIds -> fallback to config.projectId
    let rawAllowed = req.body.allowedProjectIds;
    if (!rawAllowed || !Array.isArray(rawAllowed) || rawAllowed.length === 0) {
      rawAllowed = config?.allowedProjectIds;
    }
    const allowedProjectIds = (Array.isArray(rawAllowed) && rawAllowed.length > 0)
      ? rawAllowed.map(String)
      : (config?.projectId && config.projectId !== 'all')
      ? [String(config.projectId)]
      : [];

    const assigneeId = req.body.assigneeId || 'me';
    const statusId = req.body.statusId || 'all';
    const statusOperator = req.body.statusOperator || '=';
    const mock = req.body.mock === true || config?.mock === true;

    const items = await getReportItemsList({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator, mock });
    res.json({ items, total: items.length });
  } catch (error) {
    console.error('Error fetching report items:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch report items' });
  }
});

// POST /api/openproject/export-report
// Supports filters for: Project, Assignee, Status, and optional selectedIds
router.post('/export-report', async (req, res) => {
  try {
    const config = getOpenProjectConfig();
    const host = req.body.host || config?.host;
    const apiKey = req.body.apiKey || config?.apiKey;
    const projectId = req.body.projectId || 'all';
    
    // Resolve allowedProjectIds: body -> config.allowedProjectIds -> fallback to config.projectId
    let rawAllowed = req.body.allowedProjectIds;
    if (!rawAllowed || !Array.isArray(rawAllowed) || rawAllowed.length === 0) {
      rawAllowed = config?.allowedProjectIds;
    }
    const allowedProjectIds = (Array.isArray(rawAllowed) && rawAllowed.length > 0)
      ? rawAllowed.map(String)
      : (config?.projectId && config.projectId !== 'all')
      ? [String(config.projectId)]
      : [];

    const assigneeId = req.body.assigneeId || 'me'; // Default to 'me'
    const statusId = req.body.statusId || 'all';
    const statusOperator = req.body.statusOperator || '=';
    const selectedIds = req.body.selectedIds || null;
    const directItems = req.body.items || null;
    const mock = req.body.mock === true || config?.mock === true;

    let items = [];

    if (Array.isArray(directItems) && directItems.length > 0) {
      items = directItems;
    } else {
      items = await getReportItemsList({ host, apiKey, projectId, allowedProjectIds, assigneeId, statusId, statusOperator, mock });
    }

    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      const idSet = new Set(selectedIds.map(String));
      items = items.filter(it => idSet.has(String(it.id)));
    }

    // Build Excel Workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NexTask Task Prioritizer';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('OpenProject Tickets', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // User requested: arrange the excel header and move Root Cause and Resolution at the end
    sheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Subject', key: 'subject', width: 50 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Assignee', key: 'assignee', width: 22 },
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Root Cause', key: 'rootCause', width: 48 },
      { header: 'Resolution', key: 'resolution', width: 48 },
    ];

    // Style Header Row (Dark Indigo with White Text)
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }, // Indigo-900
    };

    // Add rows and style them
    items.forEach((item, index) => {
      const row = sheet.addRow(item);
      row.alignment = { vertical: 'top', wrapText: true };
      row.font = { name: 'Segoe UI', size: 10 };

      // Alternating row background
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // Slate-50
        };
      }

      // Add light borders
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const filename = `openproject-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating OpenProject Excel report:', error);
    res.status(500).json({ error: `Excel report export failed: ${error.message}` });
  }
});

module.exports = router;
