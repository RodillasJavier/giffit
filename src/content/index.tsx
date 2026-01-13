/**
 * Content Script
 * Runs on all YouTube pages, detects video pages, and injects React overlay on demand
 */

import { parseYouTubeUrl } from '../utils/youtubeParser';
import { initOverlay } from '../components/Overlay';
import './content.css';

// Video info interface
interface VideoInfo {
  videoId: string | null;
  duration: number;
  currentTime: number;
  src: string;
}

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

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content] Message received:', message);

    if (message.type === 'TOGGLE_OVERLAY') {
      toggleOverlay();
      sendResponse({ success: true });
    }

    return true; // Keep channel open for async response
  });

  // Watch for URL changes (YouTube is a SPA)
  observeUrlChanges();

  // Watch for DOM changes to detect when video player loads
  observeVideoPlayer();
}

/**
 * Check if current page is a YouTube video page
 */
function isYouTubeVideoPage(): boolean {
  return window.location.pathname === '/watch' &&
         window.location.search.includes('v=');
}

/**
 * Get video element info from the page
 */
async function getVideoInfo(): Promise<VideoInfo | null> {
  const video = await waitForVideo();
  if (!video) {
    console.error('[YouTube to GIF] No video element found');
    return null;
  }

  // Parse video ID from URL
  const urlInfo = parseYouTubeUrl(window.location.href);

  return {
    videoId: urlInfo.videoId,
    duration: video.duration || 0,
    currentTime: video.currentTime || 0,
    src: video.src || video.currentSrc || ''
  };
}

/**
 * Wait for video element to be available and loaded
 */
function waitForVideo(): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const video = document.querySelector('video');

    if (video && video.readyState >= 2) {
      resolve(video);
      return;
    }

    // Wait for video to load
    const timeout = setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector('video'));
    }, 5000); // 5 second timeout

    const observer = new MutationObserver(() => {
      const video = document.querySelector('video');
      if (video && video.readyState >= 2) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(video);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Toggle the overlay on/off
 */
async function toggleOverlay() {
  console.log('[YouTube to GIF] Toggle overlay requested, current state:', overlayInjected);

  if (!isYouTubeVideoPage()) {
    console.log('[YouTube to GIF] Not on video page, cannot toggle overlay');
    return;
  }

  if (overlayInjected) {
    removeOverlay();
  } else {
    const videoInfo = await getVideoInfo();
    if (videoInfo) {
      injectOverlay(videoInfo);
    } else {
      console.error('[YouTube to GIF] Failed to get video info');
    }
  }
}

/**
 * Inject the React overlay into the page
 */
async function injectOverlay(videoInfo: VideoInfo) {
  // Check if overlay already exists
  if (document.getElementById('ytgif-overlay-root')) {
    console.log('[YouTube to GIF] Overlay already exists');
    return;
  }

  console.log('[YouTube to GIF] Injecting overlay with video info:', videoInfo);

  // Create container for React app
  const overlayRoot = document.createElement('div');
  overlayRoot.id = 'ytgif-overlay-root';
  overlayRoot.className = 'ytgif-overlay-container visible';

  // Append to body
  document.body.appendChild(overlayRoot);

  overlayInjected = true;

  // Initialize the React overlay (imported at top of file)
  try {
    // Pass video info to overlay
    initOverlay(videoInfo as any); // Temporary type cast, will update Overlay component to accept VideoInfo
    console.log('[YouTube to GIF] Overlay initialized successfully');
  } catch (error) {
    console.error('[YouTube to GIF] Failed to initialize overlay:', error);
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
  console.log('[YouTube to GIF] Overlay removed');
}

/**
 * Observe URL changes in YouTube's SPA
 * Remove overlay when navigating away from video pages
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

        // Close overlay if navigating away from video page
        if (!isYouTubeVideoPage() && overlayInjected) {
          console.log('[YouTube to GIF] Navigated away from video page, removing overlay');
          removeOverlay();
        }
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
 * No longer needed for auto-injection, but kept for future use
 */
function observeVideoPlayer() {
  // Simplified - no longer auto-injects overlay
  // Overlay is now only shown when user clicks extension icon
}

// Start the content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
