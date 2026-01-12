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
    // Method 1: Try to get from ytInitialData
    const ytInitialData = (window as any).ytInitialData;
    if (ytInitialData) {
      // Look for clip renderer in the page data
      const clipData = findClipData(ytInitialData);
      if (clipData) {
        Object.assign(info, clipData);
      }
    }

    // Method 2: Try to get from ytInitialPlayerResponse
    const ytPlayerResponse = (window as any).ytInitialPlayerResponse;
    if (ytPlayerResponse) {
      const playerData = extractFromPlayerResponse(ytPlayerResponse);
      if (playerData) {
        Object.assign(info, playerData);
      }
    }

    // Method 3: Try to extract from the URL hash or video player
    const urlInfo = extractFromCurrentUrl();
    if (urlInfo) {
      Object.assign(info, urlInfo);
    }

    // Method 4: Try to get from the video element itself
    const videoElement = document.querySelector('video');
    if (videoElement && info.videoId) {
      // If we have a video element but no times, we might be able to infer them
      // from the video player's UI or attributes
      const playerInfo = extractFromVideoPlayer(videoElement);
      if (playerInfo) {
        Object.assign(info, playerInfo);
      }
    }

    // Only log if we found something useful
    if (info.videoId || info.startTime !== undefined || info.endTime !== undefined) {
      console.log('[ClipExtractor] Extracted clip info:', info);
    }
  } catch (error) {
    console.error('[ClipExtractor] Error extracting clip info:', error);
  }

  return info;
}

/**
 * Recursively search for clip data in YouTube's initial data
 */
function findClipData(obj: any): Partial<YouTubeClipInfo> | null {
  if (!obj || typeof obj !== 'object') return null;

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

  // Recursively search nested objects and arrays
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findClipData(obj[key]);
      if (result && result.videoId) {
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
    // Try to find clip info from data attributes or nearby elements
    const playerContainer = videoElement.closest('.html5-video-player');
    if (playerContainer) {
      const videoId = playerContainer.getAttribute('data-video-id');
      if (videoId) {
        return { videoId };
      }
    }

    // Try to get from meta tags
    const videoIdMeta = document.querySelector('meta[itemprop="videoId"]');
    if (videoIdMeta) {
      const videoId = videoIdMeta.getAttribute('content');
      if (videoId) {
        return { videoId };
      }
    }

    // Try to get from canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      const href = canonical.getAttribute('href');
      if (href) {
        const match = href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (match) {
          return { videoId: match[1] };
        }
      }
    }
  } catch (error) {
    console.error('[ClipExtractor] Error extracting from video player:', error);
  }
  return null;
}

/**
 * Wait for YouTube to load clip data
 * Returns a promise that resolves when clip data is available
 */
export async function waitForClipData(timeout = 5000): Promise<Partial<YouTubeClipInfo>> {
  const startTime = Date.now();
  let lastLogTime = 0;

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const info = extractClipInfoFromPage(null);

      // Log only every 1 second to avoid spam
      const now = Date.now();
      if (now - lastLogTime > 1000) {
        console.log('[ClipExtractor] Waiting for clip data...', { videoId: info.videoId });
        lastLogTime = now;
      }

      // Check if we have enough information
      if (info.videoId) {
        clearInterval(checkInterval);
        console.log('[ClipExtractor] Clip data found:', info);
        resolve(info);
        return;
      }

      // Timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('[ClipExtractor] Timeout waiting for clip data');
        resolve(info); // Resolve with whatever we have
      }
    }, 100); // Check every 100ms
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
