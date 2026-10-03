// Chrome Extension MV3 Service Worker
// Opens the extension in a new tab instead of a popup
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('index.html');

  // Check if a GitLab Task Manager tab is already open
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length > 0) {
    // Focus the existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    // Open a new tab
    chrome.tabs.create({ url });
  }
});

// ── Background Version Checker ────────────────────────────────────────────────
const GITHUB_REPO = 'Shariar-Hasan/gitlab-task-management';
const ALARM_NAME = 'check_extension_updates';

function compareVersions(latest, current) {
  if (!latest || !current) return false;
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj, lMin, lPatch] = parse(latest);
  const [cMaj, cMin, cPatch] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return (lPatch || 0) > (cPatch || 0);
}

async function performUpdateCheck() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return;
    const release = await res.json();
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version || '1.1.0';
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const updateAvailable = compareVersions(latestVersion, currentVersion);

    const zipAsset = release.assets?.find((a) => a.name?.toLowerCase().endsWith('.zip') || a.browser_download_url?.toLowerCase().endsWith('.zip')) || release.assets?.[0];
    const downloadUrl = zipAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/latest`;

    const updateInfo = {
      updateAvailable,
      latestVersion,
      currentVersion,
      releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      downloadUrl,
      publishedAt: release.published_at,
      releaseNotes: release.body || '',
      lastCheckedAt: Date.now(),
    };

    await chrome.storage.local.set({ extension_update_info: updateInfo });
  } catch (err) {
    console.warn('[GitLabTaskManager] Background version check error:', err);
  }
}

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    performUpdateCheck();
  }
});

// Setup on install/startup
chrome.runtime.onInstalled.addListener(() => {
  // Check once immediately on install/update
  performUpdateCheck();
  // Register recurring alarm every 4 hours (240 minutes)
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 240,
    delayInMinutes: 5,
  });
});

chrome.runtime.onStartup.addListener(() => {
  performUpdateCheck();
});

