/**
 * Content Script Loader
 * This is a simple non-module script that loads the actual ES module content script
 * Chrome extensions don't support ES modules for content scripts directly,
 * so we use this wrapper to dynamically import it
 */

(async function() {
  try {
    // Get the extension's base URL
    const extensionUrl = chrome.runtime.getURL('');

    // Dynamically import the real content script as a module
    await import(chrome.runtime.getURL('content-main.js'));

    console.log('[YouTube to GIF] Content script loaded successfully');
  } catch (error) {
    console.error('[YouTube to GIF] Failed to load content script:', error);
  }
})();
