// Background service worker
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Track current YouTube URL
let currentYoutubeUrl = null;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    currentYoutubeUrl = tab.url.split('&')[0];
    chrome.runtime.sendMessage({ type: 'TAB_UPDATED', url: currentYoutubeUrl, tabId });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      currentYoutubeUrl = tab.url.split('&')[0];
      chrome.runtime.sendMessage({ type: 'TAB_ACTIVATED', url: currentYoutubeUrl, tabId: activeInfo.tabId });
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_SIDEPANEL') {
    // Side panel opens automatically via setPanelBehavior
    sendResponse({ ok: true });
  }

  if (msg.type === 'TRIGGER_SUMMARIZE') {
    currentYoutubeUrl = msg.url;
    // Forward to side panel
    chrome.runtime.sendMessage({ type: 'TAB_UPDATED', url: msg.url });
    chrome.runtime.sendMessage({ type: 'AUTO_SUMMARIZE', url: msg.url });
  }
});
