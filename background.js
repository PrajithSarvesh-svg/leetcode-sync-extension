/**
 * background.js — Service worker for LeetCode → GitHub Sync
 * Handles: tab events, extension badge updates, message routing
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeetCode→GitHub] Extension installed.');
  chrome.action.setBadgeBackgroundColor({ color: '#00d4aa' });
});

// Update badge when user navigates to/from LeetCode
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (tab.url && tab.url.includes('leetcode.com/problems')) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#00d4aa', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// Listen for submission success messages from content script
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'SUBMISSION_ACCEPTED') {
    // Flash badge
    chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#00d4aa', tabId: sender.tab.id });
  }
});
