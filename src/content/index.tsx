/**
 * Content Script
 * Runs on all YouTube pages, detects clips, and injects React overlay
 */

import { parseYouTubeUrl, isYouTubeClipPage, type YouTubeClipInfo } from '../utils/youtubeParser';
import { extractClipInfoFromPage, waitForClipData, inferClipTimesFromPlayer, detectClipBoundariesFromPlayer } from '../utils/clipExtractor';
import { initOverlay } from '../components/Overlay';
import { injectPageContextScript, requestYouTubeDataFromPage } from '../utils/pageContextBridge';
import './content.css';

// Track if overlay is already injected
let overlayInjected = false;
let currentUrl = window.location.href;

/**
 * Initialize the content script
 */
function init() {
  console.log('[YouTube to GIF] Content script loaded');

  // Inject page context bridge to access YouTube data
  injectPageContextScript();

  // Create a long-lived connection to keep service worker alive
  const port = chrome.runtime.connect({ name: 'keepalive' });
  port.onDisconnect.addListener(() => {
    console.log('[YouTube to GIF] Keepalive port disconnected');
  });

  // Set up message listener for popup requests
  setupMessageListener();

  // Note: We no longer auto-inject overlay on clip detection
  // User must click extension icon to trigger overlay
}

/**
 * Set up message listener for popup requests
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[YouTube to GIF] Message received:', message);

    if (message.type === 'OPEN_OVERLAY') {
      handleOpenOverlay()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));

      // Return true to indicate async response
      return true;
    }
  });
}

/**
 * Handle request to open overlay from popup
 */
async function handleOpenOverlay() {
  const url = window.location.href;

  // Check if we're on a clip page
  if (!isYouTubeClipPage(url)) {
    return {
      success: false,
      error: 'Not on a YouTube clip page'
    };
  }

  // Parse the URL
  const clipInfo = parseYouTubeUrl(url);
  console.log('[YouTube to GIF] Parsed clip info:', clipInfo);

  // Try to extract complete clip information
  try {
    // If we're missing clip info, try to extract from page
    if (clipInfo.clipId && (!clipInfo.videoId || clipInfo.startTime === null || clipInfo.endTime === null)) {
      console.log('[YouTube to GIF] Incomplete clip info, extracting from page...');

      // Strategy 1: Get video ID from page context (can access window.ytInitialPlayerResponse)
      if (!clipInfo.videoId) {
        console.log('[YouTube to GIF] Requesting video ID from page context...');
        const pageData = await requestYouTubeDataFromPage(3000);
        if (pageData.videoId) {
          clipInfo.videoId = pageData.videoId;
          console.log('[YouTube to GIF] Got video ID from page context:', pageData.videoId);
        } else {
          console.warn('[YouTube to GIF] Failed to get video ID from page context');
        }
      }

      // Strategy 2: Observe player behavior to detect clip boundaries
      if (clipInfo.startTime === null || clipInfo.endTime === null) {
        console.log('[YouTube to GIF] Observing player behavior to detect clip boundaries...');
        const playerBoundaries = await detectClipBoundariesFromPlayer(10000);

        if (playerBoundaries) {
          if (clipInfo.startTime === null) clipInfo.startTime = playerBoundaries.startTime;
          if (clipInfo.endTime === null) clipInfo.endTime = playerBoundaries.endTime;
          console.log('[YouTube to GIF] Detected boundaries from player:', playerBoundaries);
        } else {
          console.warn('[YouTube to GIF] Failed to detect boundaries from player');
        }
      }

      console.log('[YouTube to GIF] Final clip info:', clipInfo);
    }

    // Check if extraction was successful
    if (!clipInfo.videoId || clipInfo.startTime === null || clipInfo.endTime === null) {
      return {
        success: false,
        error: 'Failed to extract clip information. Please ensure you are on a valid YouTube clip page and that the video is loaded.'
      };
    }

    // Inject the overlay with the extracted info
    await injectOverlay(clipInfo);

    return {
      success: true,
      clipInfo: clipInfo
    };
  } catch (error) {
    console.error('[YouTube to GIF] Error extracting clip info:', error);
    return {
      success: false,
      error: 'Failed to extract clip information: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

/**
 * Inject the React overlay into the page
 */
async function injectOverlay(clipInfo: YouTubeClipInfo) {
  // Check if overlay already exists
  if (document.getElementById('ytgif-overlay-root')) {
    console.log('[YouTube to GIF] Overlay already exists');
    return;
  }

  // Create container for React app
  const overlayRoot = document.createElement('div');
  overlayRoot.id = 'ytgif-overlay-root';
  overlayRoot.className = 'ytgif-overlay-container';

  // Append to body
  document.body.appendChild(overlayRoot);

  overlayInjected = true;

  // Initialize the React overlay (imported at top of file)
  try {
    initOverlay(clipInfo);
    console.log('[YouTube to GIF] Overlay initialized successfully');
  } catch (error) {
    console.error('[YouTube to GIF] Failed to initialize overlay:', error);
    throw error; // Propagate error to caller
  }
}


/**
 * Remove the overlay from the page
 */
function removeOverlay() {
  const overlayRoot = document.getElementById('ytgif-overlay-root');
  if (overlayRoot) {
    overlayRoot.remove();
  }

  overlayInjected = false;
}

// Start the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
