/**
 * YouTube URL Parser
 * Extracts video ID, clip ID, and time parameters from various YouTube URL formats
 */

export interface YouTubeClipInfo {
  videoId: string | null;
  clipId: string | null;
  startTime: number | null; // in seconds
  endTime: number | null;   // in seconds
  isClip: boolean;
  url: string;
}

/**
 * Parse YouTube URL and extract clip information
 */
export function parseYouTubeUrl(url: string): YouTubeClipInfo {
  const result: YouTubeClipInfo = {
    videoId: null,
    clipId: null,
    startTime: null,
    endTime: null,
    isClip: false,
    url: url
  };

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Check for clip URL: youtube.com/clip/UgkxXXXX
    if (pathname.includes('/clip/')) {
      result.isClip = true;
      const clipMatch = pathname.match(/\/clip\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) {
        result.clipId = clipMatch[1];
      }
      // Clip URLs may have videoId in query params
      result.videoId = searchParams.get('v');
      return result;
    }

    // Extract video ID from various URL formats
    if (hostname.includes('youtube.com')) {
      // Standard watch URL: youtube.com/watch?v=VIDEO_ID
      result.videoId = searchParams.get('v');

      // Embed URL: youtube.com/embed/VIDEO_ID
      const embedMatch = pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) {
        result.videoId = embedMatch[1];
      }

      // Shorts URL: youtube.com/shorts/VIDEO_ID
      const shortsMatch = pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        result.videoId = shortsMatch[1];
      }
    } else if (hostname.includes('youtu.be')) {
      // Short URL: youtu.be/VIDEO_ID
      const shortMatch = pathname.match(/\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        result.videoId = shortMatch[1];
      }
    }

    // Extract time parameters
    // Format 1: &start=10&end=20 (used in clip share URLs)
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (start) {
      result.startTime = parseInt(start, 10);
      result.isClip = true;
    }

    if (end) {
      result.endTime = parseInt(end, 10);
      result.isClip = true;
    }

    // Format 2: &t=10s or &t=10 (regular timestamp)
    const timestamp = searchParams.get('t');
    if (timestamp) {
      result.startTime = parseTimeString(timestamp);
    }

    // Format 3: #t=10 (hash timestamp)
    const hashTime = urlObj.hash.match(/#t=(\d+)/);
    if (hashTime) {
      result.startTime = parseInt(hashTime[1], 10);
    }

  } catch (error) {
    console.error('Error parsing YouTube URL:', error);
  }

  return result;
}

/**
 * Parse time string to seconds
 * Supports formats: "10s", "10", "1m30s", "1h2m3s"
 */
function parseTimeString(timeStr: string): number {
  // Remove 's' suffix if present
  timeStr = timeStr.replace(/s$/, '');

  // If it's just a number, return it
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr, 10);
  }

  // Parse complex time formats: 1h2m3s or 1m30s
  const hourMatch = timeStr.match(/(\d+)h/);
  const minMatch = timeStr.match(/(\d+)m/);
  const secMatch = timeStr.match(/(\d+)(?!h|m)/);

  let totalSeconds = 0;
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
  if (secMatch) totalSeconds += parseInt(secMatch[1], 10);

  return totalSeconds;
}

/**
 * Check if current URL is a YouTube clip page
 */
export function isYouTubeClipPage(url: string): boolean {
  const clipInfo = parseYouTubeUrl(url);
  return clipInfo.isClip || clipInfo.clipId !== null;
}

/**
 * Format seconds to human-readable time string
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get clip duration in seconds
 */
export function getClipDuration(clipInfo: YouTubeClipInfo): number | null {
  if (clipInfo.startTime !== null && clipInfo.endTime !== null) {
    return clipInfo.endTime - clipInfo.startTime;
  }
  return null;
}
