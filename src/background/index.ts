/**
 * Background Service Worker
 * Handles extension lifecycle, messaging, downloads, and offscreen document
 */

let offscreenDocumentCreated = false;

/**
 * Create offscreen document for FFmpeg processing
 */
async function setupOffscreenDocument() {
  if (offscreenDocumentCreated) {
    return;
  }

  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  });

  if (existingContexts.length > 0) {
    console.log('[Background] Offscreen document already exists');
    offscreenDocumentCreated = true;
    return;
  }

  try {
    console.log('[Background] Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS' as chrome.offscreen.Reason],
      justification: 'FFmpeg video processing requires Web Workers'
    });

    console.log('[Background] Offscreen document created, waiting for it to be ready...');

    // Wait for offscreen document to load and respond to ping
    await waitForOffscreenReady();

    offscreenDocumentCreated = true;
    console.log('[Background] Offscreen document ready');
  } catch (error) {
    console.error('[Background] Failed to create offscreen document:', error);
    throw error;
  }
}

/**
 * Wait for offscreen document to be ready by pinging it
 */
async function waitForOffscreenReady(maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PING' });
      if (response && response.success) {
        console.log('[Background] Offscreen document responded to ping');
        return;
      }
    } catch (error) {
      // Offscreen not ready yet, wait and retry
      console.log(`[Background] Offscreen ping attempt ${i + 1} failed, retrying...`);
    }

    // Wait 200ms before next attempt
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  throw new Error('Offscreen document failed to respond after multiple attempts');
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
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

  // Set up offscreen document
  await setupOffscreenDocument();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] ===== MESSAGE RECEIVED =====');
  console.log('[Background] Type:', message.type);
  console.log('[Background] Sender:', sender);
  console.log('[Background] Message:', message);

  // Handle async operations
  handleMessage(message, sender)
    .then(response => {
      console.log('[Background] Sending response:', response);
      sendResponse(response);
    })
    .catch(error => {
      console.error('[Background] Error handling message:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    });

  // Return true to indicate we'll send response asynchronously
  return true;
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender) {
  // Don't handle messages from offscreen document (to avoid loops)
  if (sender.url && sender.url.includes('offscreen.html')) {
    return { success: false, error: 'Messages from offscreen should not be routed' };
  }

  // Ensure offscreen document exists for FFmpeg operations
  if (message.type === 'INIT_FFMPEG' || message.type === 'CONVERT_VIDEO') {
    try {
      await setupOffscreenDocument();
    } catch (error) {
      console.error('[Background] Failed to setup offscreen document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup offscreen document'
      };
    }
  }

  switch (message.type) {
    case 'CLIP_DETECTED':
      handleClipDetected(message.clipInfo, sender);
      return { success: true };

    case 'START_CONVERSION':
      return await handleStartConversion(message.clipInfo, message.settings);

    case 'DOWNLOAD_GIF':
      handleDownload(message.blob, message.filename);
      return { success: true };

    // Forward FFmpeg messages to offscreen document
    case 'INIT_FFMPEG':
    case 'CONVERT_VIDEO':
      console.log('[Background] Forwarding to offscreen:', message.type);
      try {
        // Send to offscreen and wait for response
        const response = await chrome.runtime.sendMessage(message);
        console.log('[Background] Offscreen responded:', response);
        return response;
      } catch (error) {
        console.error('[Background] Failed to forward to offscreen:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to communicate with offscreen document'
        };
      }

    default:
      console.warn('[Background] Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

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
async function handleStartConversion(clipInfo: any, settings: any) {
  console.log('[Background] Starting conversion:', { clipInfo, settings });
  // The actual conversion happens in the content script/offscreen document
  // This is just for logging and could be used for analytics
  return { success: true };
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

// Set up offscreen document when service worker starts
setupOffscreenDocument().catch(error => {
  console.error('[Background] Failed to setup offscreen on startup:', error);
});

// Keep service worker alive by setting up a port connection
chrome.runtime.onConnect.addListener((port) => {
  console.log('[Background] Port connected:', port.name);

  port.onDisconnect.addListener(() => {
    console.log('[Background] Port disconnected:', port.name);
  });
});
