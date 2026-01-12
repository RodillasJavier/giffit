/**
 * Content Script
 * Runs on all YouTube pages, detects clips, and injects React overlay
 */

import { parseYouTubeUrl, isYouTubeClipPage, type YouTubeClipInfo } from '../utils/youtubeParser';
import { extractClipInfoFromPage, waitForClipData, inferClipTimesFromPlayer } from '../utils/clipExtractor';
import { initOverlay } from '../components/Overlay';
import './content.css';

// Track if overlay is already injected
let overlayInjected = false;
let currentUrl = window.location.href;

/**
 * Initialize the content script
 */
function init() {
  console.log('[YouTube to GIF] Content script loaded');

  // Create a long-lived connection to keep service worker alive
  const port = chrome.runtime.connect({ name: 'keepalive' });
  port.onDisconnect.addListener(() => {
    console.log('[YouTube to GIF] Keepalive port disconnected');
  });

  checkAndInjectOverlay();

  // Watch for URL changes (YouTube is a SPA)
  observeUrlChanges();

  // Watch for DOM changes to detect when video player loads
  observeVideoPlayer();
}

/**
 * Check if current page is a clip and inject overlay if needed
 */
function checkAndInjectOverlay() {
  const url = window.location.href;
  const clipInfo = parseYouTubeUrl(url);

  console.log('[YouTube to GIF] Parsed URL:', clipInfo);

  if (isYouTubeClipPage(url) && !overlayInjected) {
    console.log('[YouTube to GIF] Clip detected, injecting overlay');
    injectOverlay(clipInfo);
  } else if (!isYouTubeClipPage(url) && overlayInjected) {
    console.log('[YouTube to GIF] No longer on clip page, removing overlay');
    removeOverlay();
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

  // If this is a clip page but we're missing info, try to extract it from the page
  if (clipInfo.clipId && (!clipInfo.videoId || clipInfo.startTime === null || clipInfo.endTime === null)) {
    console.log('[YouTube to GIF] Incomplete clip info, extracting from page...');

    try {
      // Wait for YouTube to load the clip data
      const extractedInfo = await waitForClipData(3000);

      // Merge extracted info with existing clipInfo
      if (extractedInfo.videoId) clipInfo.videoId = extractedInfo.videoId;
      if (extractedInfo.startTime !== undefined && extractedInfo.startTime !== null) {
        clipInfo.startTime = extractedInfo.startTime;
      }
      if (extractedInfo.endTime !== undefined && extractedInfo.endTime !== null) {
        clipInfo.endTime = extractedInfo.endTime;
      }

      // If we still don't have times, try to infer from player
      if (clipInfo.startTime === null || clipInfo.endTime === null) {
        console.log('[YouTube to GIF] Inferring clip times from player...');
        const inferredTimes = inferClipTimesFromPlayer();
        if (inferredTimes) {
          if (clipInfo.startTime === null) clipInfo.startTime = inferredTimes.startTime;
          if (clipInfo.endTime === null) clipInfo.endTime = inferredTimes.endTime;
        }
      }

      console.log('[YouTube to GIF] Final clip info:', clipInfo);
    } catch (error) {
      console.error('[YouTube to GIF] Failed to extract clip info:', error);
    }
  }

  // Create container for React app
  const overlayRoot = document.createElement('div');
  overlayRoot.id = 'ytgif-overlay-root';
  overlayRoot.className = 'ytgif-overlay-container';

  // Append to body
  document.body.appendChild(overlayRoot);

  // Send message to background script (this wakes up the service worker)
  chrome.runtime.sendMessage({
    type: 'CLIP_DETECTED',
    clipInfo: clipInfo
  }).catch(error => {
    console.error('[YouTube to GIF] Failed to send clip detection:', error);
  });

  overlayInjected = true;

  // Initialize the React overlay (imported at top of file)
  try {
    initOverlay(clipInfo);
    console.log('[YouTube to GIF] Overlay initialized successfully');
  } catch (error) {
    console.error('[YouTube to GIF] Failed to initialize overlay:', error);
    // Fallback to simple button
    injectSimpleButton(clipInfo);
  }
}

/**
 * Temporary: Inject a simple button until React overlay is ready
 */
function injectSimpleButton(clipInfo: YouTubeClipInfo) {
  const button = document.createElement('button');
  button.id = 'ytgif-temp-button';
  button.innerHTML = '🎬 Create GIF';
  button.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  };

  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };

  button.onclick = () => {
    console.log('[YouTube to GIF] Button clicked, clip info:', clipInfo);
    alert(`Clip detected!\n\nVideo ID: ${clipInfo.videoId}\nStart: ${clipInfo.startTime}s\nEnd: ${clipInfo.endTime}s\n\nReact overlay coming in next step!`);
  };

  document.body.appendChild(button);
}

/**
 * Remove the overlay from the page
 */
function removeOverlay() {
  const overlayRoot = document.getElementById('ytgif-overlay-root');
  if (overlayRoot) {
    overlayRoot.remove();
  }

  const tempButton = document.getElementById('ytgif-temp-button');
  if (tempButton) {
    tempButton.remove();
  }

  overlayInjected = false;
}

/**
 * Observe URL changes in YouTube's SPA
 * YouTube doesn't trigger page reloads, so we need to watch for URL changes
 */
function observeUrlChanges() {
  let lastUrl = window.location.href;
  let checkTimeout: number | null = null;

  // Debounced URL check to avoid excessive calls
  const debouncedCheck = () => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }
    checkTimeout = window.setTimeout(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('[YouTube to GIF] URL changed:', currentUrl);
        checkAndInjectOverlay();
      }
      checkTimeout = null;
    }, 500); // Wait 500ms before checking
  };

  // Listen to popstate (back/forward navigation)
  window.addEventListener('popstate', () => {
    console.log('[YouTube to GIF] Navigation detected (popstate)');
    debouncedCheck();
  });

  // And pushstate/replacestate (YouTube's navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    console.log('[YouTube to GIF] Navigation detected (pushState)');
    debouncedCheck();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    // Don't log or check on replaceState as it's too frequent
    debouncedCheck();
  };
}

/**
 * Observe when video player loads
 * This helps ensure we inject at the right time
 */
function observeVideoPlayer() {
  let lastCheck = 0;
  const CHECK_INTERVAL = 1000; // Only check once per second

  const observer = new MutationObserver((mutations) => {
    // Throttle checks to avoid excessive calls
    const now = Date.now();
    if (now - lastCheck < CHECK_INTERVAL) {
      return;
    }
    lastCheck = now;

    // Check if video player exists
    const videoPlayer = document.querySelector('video');
    if (videoPlayer && isYouTubeClipPage(window.location.href) && !overlayInjected) {
      console.log('[YouTube to GIF] Video player detected on clip page');
      checkAndInjectOverlay();
      // Once we inject, we can disconnect this observer
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
