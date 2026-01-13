/**
 * Bridge script that runs in the page context (not isolated world)
 * This allows us to access window.ytInitialPlayerResponse which is not accessible from content scripts
 */

export function injectPageContextScript() {
  // Check if already injected
  if (document.getElementById('ytgif-page-script')) {
    console.log('[PageBridge] Script already injected');
    return;
  }

  const script = document.createElement('script');
  script.id = 'ytgif-page-script';
  script.textContent = `
    (function() {
      console.log('[PageBridge] Running in page context');

      // Function to extract YouTube data
      function extractYouTubeData() {
        const data = {
          videoId: null,
          timestamp: Date.now()
        };

        try {
          // Try ytInitialPlayerResponse
          if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
            data.videoId = window.ytInitialPlayerResponse.videoDetails.videoId;
            console.log('[PageBridge] Found videoId in ytInitialPlayerResponse:', data.videoId);
          }

          // Try ytInitialData as fallback
          if (!data.videoId && window.ytInitialData) {
            // Search through ytInitialData for video ID
            const findVideoId = (obj, depth = 0) => {
              if (!obj || typeof obj !== 'object' || depth > 15) return null;

              if (obj.videoId && typeof obj.videoId === 'string' && obj.videoId.length === 11) {
                return obj.videoId;
              }

              for (const key in obj) {
                const result = findVideoId(obj[key], depth + 1);
                if (result) return result;
              }
              return null;
            };

            data.videoId = findVideoId(window.ytInitialData);
            if (data.videoId) {
              console.log('[PageBridge] Found videoId in ytInitialData:', data.videoId);
            }
          }
        } catch (error) {
          console.error('[PageBridge] Error extracting data:', error);
        }

        return data;
      }

      // Listen for requests from content script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'YTGIF_REQUEST_DATA') {
          console.log('[PageBridge] Received data request');
          const data = extractYouTubeData();

          // Send response back to content script
          window.postMessage({
            type: 'YTGIF_DATA_RESPONSE',
            data: data
          }, '*');
        }
      });

      console.log('[PageBridge] Ready to receive requests');
    })();
  `;

  (document.head || document.documentElement).appendChild(script);
  console.log('[PageBridge] Injected page context script');
}

/**
 * Request YouTube data from the page context
 * Returns a promise that resolves with the data
 */
export function requestYouTubeDataFromPage(timeout = 3000): Promise<{ videoId: string | null }> {
  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'YTGIF_DATA_RESPONSE') {
        console.log('[PageBridge] Received data from page context:', event.data.data);
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        resolve(event.data.data);
      }
    };

    // Set up timeout
    const timeoutId = setTimeout(() => {
      console.warn('[PageBridge] Timeout waiting for page context response');
      window.removeEventListener('message', messageHandler);
      resolve({ videoId: null });
    }, timeout);

    // Listen for response
    window.addEventListener('message', messageHandler);

    // Send request
    console.log('[PageBridge] Requesting data from page context');
    window.postMessage({ type: 'YTGIF_REQUEST_DATA' }, '*');
  });
}
