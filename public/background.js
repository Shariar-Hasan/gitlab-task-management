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
