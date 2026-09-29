/**
 * GitLab API Service — v2
 *
 * Key improvements over v1:
 *  1. Parallel batched fetching (CONCURRENCY = 5 projects at once)
 *  2. sessionStorage caching with per-entity TTLs
 *  3. Smart issue filtering: all open + closed only within last 30 days
 *  4. Abort signal support for cancellable requests
 */

import { sessionCache } from '../lib/utils.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const CONCURRENCY        = 5;
const REQUEST_TIMEOUT_MS = 20_000;
const TTL_PROJECTS       = 10 * 60 * 1000;  // 10 min
const TTL_ISSUES         = 5  * 60 * 1000;  // 5 min
const TTL_LABELS         = 15 * 60 * 1000;  // 15 min
const CLOSED_ISSUE_DAYS  = 30;              // Only fetch closed issues from last N days

// ── Error type ─────────────────────────────────────────────────────────────────
export class GitLabApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name   = 'GitLabApiError';
    this.status = status;
    this.data   = data;
  }
}

// ── Low-level fetch helpers ────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') throw new GitLabApiError('Request timed out', 408);
    throw err;
  }
}

function buildHeaders(token, extra = {}) {
  return { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': token, ...extra };
}

async function restRequest(instanceUrl, token, path, options = {}) {
  const url = `${instanceUrl.replace(/\/$/, '')}/api/v4${path}`;
  const res  = await fetchWithTimeout(url, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  if (res.status === 204) return { data: null, totalPages: 1, nextPage: null };

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitLabApiError(
      body.message || `HTTP ${res.status}: ${res.statusText}`,
      res.status,
      body
    );
  }

  const data       = await res.json();
  const totalPages = parseInt(res.headers.get('X-Total-Pages') || '1', 10);
  const nextPage   = res.headers.get('X-Next-Page');
  return { data, totalPages, nextPage: nextPage ? parseInt(nextPage, 10) : null };
}

async function graphqlRequest(instanceUrl, token, query, variables = {}) {
  const url = `${instanceUrl.replace(/\/$/, '')}/api/graphql`;
  const res  = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitLabApiError(body.message || `GraphQL HTTP ${res.status}`, res.status, body);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new GitLabApiError(json.errors.map((e) => e.message).join('; '), 200, json);
  }
  return json.data;
}

// ── Parallelism helper ─────────────────────────────────────────────────────────
/**
 * Run tasks with a concurrency cap. Each task is a () => Promise<T[]>.
 * Returns a flat array of all resolved values; rejected tasks yield [].
 */
async function batchedParallel(tasks, concurrency = CONCURRENCY, onProgress) {
  const results = [];
  let completed  = 0;

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch   = tasks.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((t) => t()));
    settled.forEach((r) => {
      results.push(...(r.status === 'fulfilled' ? r.value : []));
    });
    completed += batch.length;
    onProgress?.(Math.min(99, Math.round((completed / tasks.length) * 100)));
  }

  onProgress?.(100);
  return results;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function validateConnection(instanceUrl, token) {
  const { data } = await restRequest(instanceUrl, token, '/user');
  return data;
}

// ── Projects ──────────────────────────────────────────────────────────────────
export async function fetchAllProjects(instanceUrl, token, { force = false } = {}) {
  const cacheKey = `projects_${instanceUrl}`;
  if (!force) {
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;
  }

  const projects = [];
  let page = 1;

  while (true) {
    const { data, nextPage } = await restRequest(
      instanceUrl, token,
      `/projects?membership=true&per_page=100&page=${page}&simple=true&order_by=last_activity_at`
    );
    projects.push(...data);
    if (!nextPage || page >= 10) break;   // cap at 1 000 projects
    page = nextPage;
  }

  sessionCache.set(cacheKey, projects, TTL_PROJECTS);
  return projects;
}

// ── Issues (per project) ──────────────────────────────────────────────────────
/**
 * Fetch all open issues + recently-closed issues (last CLOSED_ISSUE_DAYS days)
 * for one project. Merges both lists and de-dupes by iid.
 */
async function fetchIssuesForProject(instanceUrl, token, projectId, { force = false } = {}) {
  const cacheKey = `issues_${instanceUrl}_${projectId}`;
  if (!force) {
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;
  }

  const thirtyDaysAgo = new Date(Date.now() - CLOSED_ISSUE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Fetch open and recently-closed issues in parallel
  const [openIssues, closedIssues] = await Promise.all([
    fetchPaginatedIssues(instanceUrl, token, projectId, { state: 'opened' }),
    fetchPaginatedIssues(instanceUrl, token, projectId, {
      state:         'closed',
      updated_after: thirtyDaysAgo,
    }),
  ]);

  // De-dupe (shouldn't be needed but just in case)
  const seen = new Set();
  const merged = [];
  for (const issue of [...openIssues, ...closedIssues]) {
    if (!seen.has(issue.iid)) {
      seen.add(issue.iid);
      merged.push(issue);
    }
  }

  sessionCache.set(cacheKey, merged, TTL_ISSUES);
  return merged;
}

async function fetchPaginatedIssues(instanceUrl, token, projectId, params = {}) {
  const qs = new URLSearchParams({ per_page: 100, scope: 'all', ...params }).toString();
  const issues = [];
  let page = 1;

  while (page <= 5) {   // cap: 500 issues per project per state
    const { data, nextPage } = await restRequest(
      instanceUrl, token,
      `/projects/${projectId}/issues?${qs}&page=${page}`
    );
    issues.push(...data);
    if (!nextPage) break;
    page = nextPage;
  }

  return issues;
}

// ── Bulk fetch with parallel batching ─────────────────────────────────────────
export async function fetchAllIssues(instanceUrl, token, projectIds, onProgress, { force = false } = {}) {
  const tasks = projectIds.map(
    (pid) => () => fetchIssuesForProject(instanceUrl, token, pid, { force })
  );
  return batchedParallel(tasks, CONCURRENCY, onProgress);
}

// ── Issue CRUD ────────────────────────────────────────────────────────────────
export async function createIssue(instanceUrl, token, projectId, payload) {
  const { data } = await restRequest(
    instanceUrl, token,
    `/projects/${encodeURIComponent(projectId)}/issues`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
  // Invalidate issues cache for this project
  sessionCache.invalidate(`issues_${instanceUrl}_${projectId}`);
  return data;
}

export async function updateIssue(instanceUrl, token, projectId, issueIid, payload) {
  const { data } = await restRequest(
    instanceUrl, token,
    `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`,
    { method: 'PUT', body: JSON.stringify(payload) }
  );
  sessionCache.invalidate(`issues_${instanceUrl}_${projectId}`);
  return data;
}

export async function deleteIssue(instanceUrl, token, projectId, issueIid) {
  await restRequest(
    instanceUrl, token,
    `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`,
    { method: 'DELETE' }
  );
  sessionCache.invalidate(`issues_${instanceUrl}_${projectId}`);
}

export async function closeIssue(instanceUrl, token, projectId, issueIid) {
  return updateIssue(instanceUrl, token, projectId, issueIid, { state_event: 'close' });
}

export async function reopenIssue(instanceUrl, token, projectId, issueIid) {
  return updateIssue(instanceUrl, token, projectId, issueIid, { state_event: 'reopen' });
}

// ── Labels ────────────────────────────────────────────────────────────────────
export async function fetchProjectLabels(instanceUrl, token, projectId) {
  const cacheKey = `labels_${instanceUrl}_${projectId}`;
  const cached   = sessionCache.get(cacheKey);
  if (cached) return cached;

  const labels = [];
  let page = 1;

  while (page <= 5) {
    const { data, nextPage } = await restRequest(
      instanceUrl, token,
      `/projects/${encodeURIComponent(projectId)}/labels?per_page=100&page=${page}`
    );
    labels.push(...data);
    if (!nextPage) break;
    page = nextPage;
  }

  sessionCache.set(cacheKey, labels, TTL_LABELS);
  return labels;
}

export async function createLabel(instanceUrl, token, projectId, payload) {
  const { data } = await restRequest(
    instanceUrl, token,
    `/projects/${encodeURIComponent(projectId)}/labels`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
  sessionCache.invalidate(`labels_${instanceUrl}_${projectId}`);
  return data;
}

// ── Uploads (Uploads photos/files directly to GitLab project) ──────────────────
export async function uploadProjectFile(instanceUrl, token, projectId, file, projectPath = '') {
  const cleanInstance = instanceUrl.replace(/\/$/, '');
  const url = `${cleanInstance}/api/v4/projects/${encodeURIComponent(projectId)}/uploads`;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'PRIVATE-TOKEN': token,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GitLabApiError(
      body.message || `Photo upload failed (HTTP ${res.status}): ${res.statusText}`,
      res.status,
      body
    );
  }

  const data = await res.json();
  const cleanProjectPath = projectPath ? projectPath.replace(/^\/+|\/+$/g, '') : '';

  // Determine the full remote URL on the GitLab server
  let fullServerUrl = '';
  if (data.full_path) {
    fullServerUrl = data.full_path.startsWith('http')
      ? data.full_path
      : `${cleanInstance}${data.full_path.startsWith('/') ? '' : '/'}${data.full_path}`;
  } else if (cleanProjectPath && data.url) {
    fullServerUrl = `${cleanInstance}/${cleanProjectPath}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
  } else if (data.url) {
    fullServerUrl = data.url.startsWith('http')
      ? data.url
      : `${cleanInstance}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
  }

  const alt = data.alt || file.name || 'image';

  return {
    ...data,
    full_server_url: fullServerUrl,
    // Absolute server markdown with direct remote URL:
    server_markdown: fullServerUrl ? `![${alt}](${fullServerUrl})` : (data.markdown || `![${alt}](${data.url})`),
  };
}

// ── Members ───────────────────────────────────────────────────────────────────
export async function fetchProjectMembers(instanceUrl, token, projectId) {
  const cacheKey = `members_${instanceUrl}_${projectId}`;
  const cached   = sessionCache.get(cacheKey);
  if (cached) return cached;

  const { data } = await restRequest(
    instanceUrl, token,
    `/projects/${encodeURIComponent(projectId)}/members/all?per_page=100`
  );
  sessionCache.set(cacheKey, data, TTL_LABELS);
  return data;
}

// ── GraphQL Work Items (alternative fetcher) ───────────────────────────────────
const WORK_ITEMS_QUERY = /* GraphQL */ `
  query GetWorkItems($fullPath: ID!, $after: String) {
    project(fullPath: $fullPath) {
      workItems(first: 50, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id iid title state createdAt updatedAt dueDate
          assignees { nodes { id name username avatarUrl } }
          labels    { nodes { id title color } }
        }
      }
    }
  }
`;

export async function fetchWorkItems(instanceUrl, token, projectFullPath) {
  const items = [];
  let after = null, hasNextPage = true;

  while (hasNextPage) {
    const data = await graphqlRequest(instanceUrl, token, WORK_ITEMS_QUERY, {
      fullPath: projectFullPath, after,
    });
    const wi = data?.project?.workItems;
    if (!wi) break;
    items.push(...wi.nodes);
    hasNextPage = wi.pageInfo.hasNextPage;
    after       = wi.pageInfo.endCursor;
  }

  return items;
}
