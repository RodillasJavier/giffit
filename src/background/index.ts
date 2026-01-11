/**
 * Background Service Worker
 * Handles extension lifecycle, messaging, and downloads
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[YouTube to GIF] Extension installed');

    // Open welcome page or set default settings
    chrome.storage.local.set({
      settings: {
        gifQuality: 'medium',
        maxDuration: 15,
        defaultFps: 15,
        defaultWidth: 480
      }
    });
  } else if (details.reason === 'update') {
    console.log('[YouTube to GIF] Extension updated');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[YouTube to GIF] Message received:', message);

  switch (message.type) {
    case 'CLIP_DETECTED':
      handleClipDetected(message.clipInfo, sender);
      sendResponse({ success: true });
      break;

    case 'START_CONVERSION':
      handleStartConversion(message.clipInfo, message.settings);
      sendResponse({ success: true });
      break;

    case 'DOWNLOAD_GIF':
      handleDownload(message.blob, message.filename);
      sendResponse({ success: true });
      break;

    default:
      console.warn('[YouTube to GIF] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate we'll send response asynchronously
  return true;
});

/**
 * Handle clip detection from content script
 */
function handleClipDetected(clipInfo: any, sender: chrome.runtime.MessageSender) {
  console.log('[YouTube to GIF] Clip detected:', clipInfo);

  // Update extension icon badge to show clip is detected
  if (sender.tab?.id) {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: 'GIF'
    });

    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: '#667eea'
    });
  }
}

/**
 * Handle GIF conversion start
 */
function handleStartConversion(clipInfo: any, settings: any) {
  console.log('[YouTube to GIF] Starting conversion:', { clipInfo, settings });
  // Conversion logic will be implemented in later steps
  // For now, just log it
}

/**
 * Handle file download
 */
function handleDownload(blob: Blob, filename: string) {
  console.log('[YouTube to GIF] Downloading file:', filename);

  // Create download using chrome.downloads API
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result as string;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}

// Listen for tab updates to reset badge when leaving YouTube
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (!tab.url.includes('youtube.com')) {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});

console.log('[YouTube to GIF] Background service worker loaded');
