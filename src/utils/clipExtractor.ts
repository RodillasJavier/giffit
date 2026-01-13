/**
 * Clip Extractor Utility
 * Extracts clip metadata from YouTube's page data
 */

import type { YouTubeClipInfo } from './youtubeParser';

/**
 * Extract clip information from YouTube's page data
 * YouTube stores initial data in window.ytInitialData and window.ytInitialPlayerResponse
 */
export function extractClipInfoFromPage(clipId: string | null): Partial<YouTubeClipInfo> {
  const info: Partial<YouTubeClipInfo> = {};

  try {
    // Method 1: Try to get video ID from player
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      const playerInfo = extractFromVideoPlayer(videoElement);
      if (playerInfo) {
        Object.assign(info, playerInfo);
      }
    }

    // Method 2: Try to extract from the URL params
    const urlInfo = extractFromCurrentUrl();
    if (urlInfo) {
      Object.assign(info, urlInfo);
    }

    // Method 3: Try to get from ytInitialPlayerResponse (contains video details)
    const ytPlayerResponse = (window as any).ytInitialPlayerResponse;
    if (ytPlayerResponse) {
      const playerData = extractFromPlayerResponse(ytPlayerResponse);
      if (playerData) {
        Object.assign(info, playerData);
      }
    }

    // Method 4: Try to get from ytInitialData (contains clip metadata)
    const ytInitialData = (window as any).ytInitialData;
    if (ytInitialData) {
      const clipData = findClipData(ytInitialData);
      if (clipData) {
        Object.assign(info, clipData);
      }
    }

    // Method 5: For clip pages, try to extract clip times from the video player's display
    if (clipId && !info.startTime) {
      const clipTimesFromUI = extractClipTimesFromUI();
      if (clipTimesFromUI) {
        Object.assign(info, clipTimesFromUI);
      }
    }

    console.log('[ClipExtractor] Extracted clip info:', info);
  } catch (error) {
    console.error('[ClipExtractor] Error extracting clip info:', error);
  }

  return info;
}

/**
 * Recursively search for clip data in YouTube's initial data
 */
function findClipData(obj: any, depth: number = 0): Partial<YouTubeClipInfo> | null {
  if (!obj || typeof obj !== 'object' || depth > 10) return null;

  // Look for clipConfig or clipSectionRenderer
  if (obj.clipConfig) {
    const config = obj.clipConfig;
    return {
      videoId: config.postId || config.videoId || null,
      startTime: config.startTimeMs ? config.startTimeMs / 1000 : null,
      endTime: config.endTimeMs ? config.endTimeMs / 1000 : null,
    };
  }

  // Look for clip section renderer
  if (obj.clipSectionRenderer) {
    const renderer = obj.clipSectionRenderer;
    return {
      videoId: renderer.videoId || null,
      startTime: renderer.startTimeMs ? renderer.startTimeMs / 1000 : null,
      endTime: renderer.endTimeMs ? renderer.endTimeMs / 1000 : null,
    };
  }

  // Look for video details
  if (obj.videoDetails) {
    const details = obj.videoDetails;
    return {
      videoId: details.videoId || null,
    };
  }

  // Look for engagement panels which might contain clip info
  if (obj.engagementPanels || obj.engagementPanelSectionListRenderer) {
    const panels = obj.engagementPanels || [obj.engagementPanelSectionListRenderer];
    for (const panel of panels) {
      const result = findClipData(panel, depth + 1);
      if (result && result.videoId) {
        return result;
      }
    }
  }

  // Look for clip renderer patterns
  if (obj.clipCreationRenderer || obj.clipRenderer) {
    const renderer = obj.clipCreationRenderer || obj.clipRenderer;
    const videoId = renderer.videoId || renderer.sourceVideoId;
    if (videoId) {
      return {
        videoId,
        startTime: renderer.startTimeMs ? renderer.startTimeMs / 1000 : null,
        endTime: renderer.endTimeMs ? renderer.endTimeMs / 1000 : null,
      };
    }
  }

  // Recursively search nested objects and arrays (limit depth to prevent infinite loops)
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findClipData(obj[key], depth + 1);
      if (result && (result.videoId || result.startTime !== undefined)) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Extract info from ytInitialPlayerResponse
 */
function extractFromPlayerResponse(playerResponse: any): Partial<YouTubeClipInfo> | null {
  try {
    const videoDetails = playerResponse.videoDetails;
    if (videoDetails) {
      return {
        videoId: videoDetails.videoId || null,
      };
    }
  } catch (error) {
    console.error('[ClipExtractor] Error extracting from player response:', error);
  }
  return null;
}

/**
 * Extract info from current URL (query params)
 */
function extractFromCurrentUrl(): Partial<YouTubeClipInfo> | null {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Check for clip parameters in URL
    const videoId = params.get('v');
    const startParam = params.get('start') || params.get('clip_start');
    const endParam = params.get('end') || params.get('clip_end');

    if (videoId || startParam || endParam) {
      return {
        videoId: videoId || null,
        startTime: startParam ? parseFloat(startParam) : null,
        endTime: endParam ? parseFloat(endParam) : null,
      };
    }
  } catch (error) {
    console.error('[ClipExtractor] Error extracting from URL:', error);
  }
  return null;
}

/**
 * Extract info from the video player element
 */
function extractFromVideoPlayer(videoElement: HTMLVideoElement): Partial<YouTubeClipInfo> | null {
  try {
    let result: Partial<YouTubeClipInfo> = {};

    // Method 1: Try to find video ID from data attributes or nearby elements
    const playerContainer = videoElement.closest('.html5-video-player');
    if (playerContainer) {
      const videoId = playerContainer.getAttribute('data-video-id');
      if (videoId) {
        console.log('[ClipExtractor] Found videoId from player container:', videoId);
        result.videoId = videoId;
      }
    }

    // Method 2: Try to get video ID from meta tags
    if (!result.videoId) {
      const videoIdMeta = document.querySelector('meta[itemprop="videoId"]');
      if (videoIdMeta) {
        const videoId = videoIdMeta.getAttribute('content');
        if (videoId) {
          console.log('[ClipExtractor] Found videoId from meta tag:', videoId);
          result.videoId = videoId;
        }
      }
    }

    // Method 3: Try to get video ID from canonical link
    if (!result.videoId) {
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        const href = canonical.getAttribute('href');
        if (href) {
          const match = href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
          if (match) {
            console.log('[ClipExtractor] Found videoId from canonical link:', match[1]);
            result.videoId = match[1];
          }
        }
      }
    }

    // Method 4: Extract from the video src URL
    if (!result.videoId && videoElement.src) {
      const srcMatch = videoElement.src.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (srcMatch) {
        console.log('[ClipExtractor] Found videoId from video src:', srcMatch[1]);
        result.videoId = srcMatch[1];
      }
    }

    // Method 5: Check ytInitialPlayerResponse for video ID
    if (!result.videoId) {
      const ytPlayerResponse = (window as any).ytInitialPlayerResponse;
      console.log('[ClipExtractor] Checking ytInitialPlayerResponse:', {
        exists: !!ytPlayerResponse,
        hasVideoDetails: !!(ytPlayerResponse && ytPlayerResponse.videoDetails),
        videoId: ytPlayerResponse?.videoDetails?.videoId
      });
      if (ytPlayerResponse && ytPlayerResponse.videoDetails && ytPlayerResponse.videoDetails.videoId) {
        console.log('[ClipExtractor] Found videoId from ytInitialPlayerResponse:', ytPlayerResponse.videoDetails.videoId);
        result.videoId = ytPlayerResponse.videoDetails.videoId;
      }
    }

    console.log('[ClipExtractor] extractFromVideoPlayer result:', result);
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('[ClipExtractor] Error extracting from video player:', error);
  }
  return null;
}

/**
 * Wait for YouTube to load ytInitialPlayerResponse
 * Returns a promise that resolves when the object is available
 */
async function waitForYouTubeData(timeout = 3000): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const ytPlayerResponse = (window as any).ytInitialPlayerResponse;

      if (ytPlayerResponse && ytPlayerResponse.videoDetails) {
        console.log('[ClipExtractor] ytInitialPlayerResponse is now available!');
        clearInterval(checkInterval);
        resolve();
        return;
      }

      // Timeout
      if (Date.now() - startTime > timeout) {
        console.warn('[ClipExtractor] Timeout waiting for ytInitialPlayerResponse');
        clearInterval(checkInterval);
        resolve(); // Resolve anyway, we'll handle missing data later
      }
    }, 100); // Check every 100ms
  });
}

/**
 * Wait for YouTube to load clip data
 * Returns a promise that resolves when clip data is available
 */
export async function waitForClipData(timeout = 5000): Promise<Partial<YouTubeClipInfo>> {
  // First, wait for YouTube's data to load
  await waitForYouTubeData(3000);
  const startTime = Date.now();
  let lastLogTime = 0;
  const clipId = window.location.pathname.match(/\/clip\/([^/?]+)/)?.[1] || null;

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const info = extractClipInfoFromPage(clipId);

      // Log only every 1 second to avoid spam
      const now = Date.now();
      if (now - lastLogTime > 1000) {
        console.log('[ClipExtractor] Waiting for clip data...', {
          videoId: info.videoId,
          startTime: info.startTime,
          endTime: info.endTime
        });
        lastLogTime = now;
      }

      // Check if we have enough information (video ID + times)
      if (info.videoId && info.startTime !== null && info.endTime !== null) {
        clearInterval(checkInterval);
        console.log('[ClipExtractor] Complete clip data found:', info);
        resolve(info);
        return;
      }

      // Also accept if we're making progress (have video ID OR have times)
      // Continue waiting for the other piece
      const hasVideoId = info.videoId !== null && info.videoId !== undefined;
      const hasTimes = info.startTime !== null && info.endTime !== null;

      if (hasVideoId && !hasTimes) {
        console.log('[ClipExtractor] Have video ID, waiting for times...');
      } else if (!hasVideoId && hasTimes) {
        console.log('[ClipExtractor] Have times, waiting for video ID...');
      }

      // Timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('[ClipExtractor] Timeout waiting for clip data, returning what we have:', info);
        resolve(info); // Resolve with whatever we have
      }
    }, 200); // Check every 200ms (less aggressive than 100ms)
  });
}

/**
 * Observe YouTube player behavior to detect clip boundaries
 * This works by monitoring when the player seeks initially (start time)
 * and when it stops/loops (end time)
 */
export async function detectClipBoundariesFromPlayer(timeout = 10000): Promise<{ startTime: number; endTime: number } | null> {
  console.log('[ClipExtractor] Starting player observation for clip boundaries...');

  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) {
    console.error('[ClipExtractor] No video element found');
    return null;
  }

  return new Promise((resolve) => {
    let detectedStartTime: number | null = null;
    let detectedEndTime: number | null = null;
    let initialSeekDetected = false;
    let lastKnownTime = 0;
    let timeAtSamePosition = 0;
    let stuckCount = 0;
    const startObservationTime = Date.now();

    // Monitor time updates to detect when clip loops/ends
    const timeUpdateHandler = () => {
      const currentTime = Math.floor(videoElement.currentTime);

      // Detect initial seek (clip start time)
      if (!initialSeekDetected && currentTime > 0) {
        detectedStartTime = currentTime;
        initialSeekDetected = true;
        console.log('[ClipExtractor] Detected clip start time from initial seek:', detectedStartTime);
      }

      // Detect loop back (when player jumps back to start)
      if (initialSeekDetected && currentTime < lastKnownTime - 2) {
        // Player jumped backwards significantly - this is the loop point
        detectedEndTime = Math.floor(lastKnownTime);
        console.log('[ClipExtractor] Detected clip end time from loop:', detectedEndTime);
        cleanup();
        resolve({
          startTime: detectedStartTime!,
          endTime: detectedEndTime
        });
        return;
      }

      // Detect if playback is stuck (paused at end)
      if (initialSeekDetected && currentTime === lastKnownTime && currentTime > detectedStartTime!) {
        stuckCount++;
        if (stuckCount > 3) {
          // Playback hasn't progressed for 3 timeupdate events - likely at the end
          detectedEndTime = currentTime;
          console.log('[ClipExtractor] Detected clip end time from stuck playback:', detectedEndTime);
          cleanup();
          resolve({
            startTime: detectedStartTime!,
            endTime: detectedEndTime
          });
          return;
        }
      } else {
        stuckCount = 0;
      }

      lastKnownTime = currentTime;
    };

    // Monitor pause events (clip might pause at end instead of looping)
    const pauseHandler = () => {
      if (initialSeekDetected && !detectedEndTime) {
        const currentTime = Math.floor(videoElement.currentTime);
        // If paused after we started, assume this is the end
        if (currentTime >= detectedStartTime!) {
          detectedEndTime = currentTime;
          console.log('[ClipExtractor] Detected clip end time from pause:', detectedEndTime);
          cleanup();
          resolve({
            startTime: detectedStartTime!,
            endTime: detectedEndTime
          });
        }
      }
    };

    // Monitor ended events
    const endedHandler = () => {
      if (initialSeekDetected) {
        detectedEndTime = Math.floor(videoElement.currentTime);
        console.log('[ClipExtractor] Detected clip end time from ended event:', detectedEndTime);
        cleanup();
        resolve({
          startTime: detectedStartTime!,
          endTime: detectedEndTime
        });
      }
    };

    // Timeout handler
    const timeoutId = setTimeout(() => {
      console.warn('[ClipExtractor] Timeout waiting for clip boundaries');
      cleanup();

      // Return partial data if we have it
      if (detectedStartTime !== null) {
        // Estimate end time based on typical clip length
        const estimatedEnd = detectedStartTime + 30; // Default 30 second clip
        console.log('[ClipExtractor] Using estimated end time:', estimatedEnd);
        resolve({
          startTime: detectedStartTime,
          endTime: estimatedEnd
        });
      } else {
        resolve(null);
      }
    }, timeout);

    // Attach listeners
    videoElement.addEventListener('timeupdate', timeUpdateHandler);
    videoElement.addEventListener('pause', pauseHandler);
    videoElement.addEventListener('ended', endedHandler);

    // Cleanup function
    function cleanup() {
      clearTimeout(timeoutId);
      videoElement.removeEventListener('timeupdate', timeUpdateHandler);
      videoElement.removeEventListener('pause', pauseHandler);
      videoElement.removeEventListener('ended', endedHandler);
    }

    // Force play if video is paused
    if (videoElement.paused) {
      console.log('[ClipExtractor] Video is paused, attempting to play...');
      videoElement.play().catch(err => {
        console.warn('[ClipExtractor] Could not auto-play video:', err);
      });
    }
  });
}

/**
 * Get clip times from the video player's current state
 * This is useful when YouTube doesn't provide clip times in the page data
 */
export function inferClipTimesFromPlayer(): { startTime: number; endTime: number } | null {
  try {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return null;

    // Look for clip UI elements
    const clipStart = document.querySelector('[class*="clip"][class*="start"]');
    const clipEnd = document.querySelector('[class*="clip"][class*="end"]');

    // Try to parse times from UI elements
    if (clipStart && clipEnd) {
      const startText = clipStart.textContent || '';
      const endText = clipEnd.textContent || '';

      const startTime = parseTimeFromText(startText);
      const endTime = parseTimeFromText(endText);

      if (startTime !== null && endTime !== null) {
        return { startTime, endTime };
      }
    }

    // Fallback: if we can't find clip times, use the current video bounds
    // This assumes the user is watching the clip and we can use the full video duration
    const duration = videoElement.duration;
    if (duration && duration < 120) {
      // If the video is short (< 2 min), assume the whole video is the clip
      return {
        startTime: 0,
        endTime: duration,
      };
    }
  } catch (error) {
    console.error('[ClipExtractor] Error inferring clip times:', error);
  }
  return null;
}

/**
 * Parse time from text like "1:23" or "0:45"
 */
function parseTimeFromText(text: string): number | null {
  const match = text.match(/(\d+):(\d+)/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }
  return null;
}

/**
 * Extract clip times from YouTube's UI elements
 * For YouTube clips, the video element itself is trimmed to the clip boundaries
 */
function extractClipTimesFromUI(): Partial<YouTubeClipInfo> | null {
  try {
    // For YouTube clip pages, the video element contains ONLY the clipped portion
    // So we can use the video duration directly as the clip length
    const videoElement = document.querySelector('video') as HTMLVideoElement;

    if (videoElement) {
      // Wait a bit for the video to load metadata
      if (videoElement.duration && !isNaN(videoElement.duration) && videoElement.duration > 0) {
        const duration = Math.floor(videoElement.duration);

        // Clips are typically short (under 2 minutes)
        if (duration > 0 && duration <= 120) {
          console.log('[ClipExtractor] Using video element duration as clip length:', duration);
          return {
            startTime: 0,
            endTime: duration
          };
        } else if (duration > 120) {
          console.log('[ClipExtractor] Video duration is long:', duration, '- might not be a clip');
        }
      } else {
        console.log('[ClipExtractor] Video duration not yet available:', videoElement.duration);
      }
    }
  } catch (error) {
    console.error('[ClipExtractor] Error extracting clip times from UI:', error);
  }

  return null;
}
