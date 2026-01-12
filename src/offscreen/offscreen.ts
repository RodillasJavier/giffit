/**
 * Offscreen Document for FFmpeg Processing
 * This runs in the extension context and has access to Web Workers
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

console.log('[Offscreen] Offscreen document loaded');

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

// Listen for messages from the background/content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type);

  // Handle async operations
  handleMessage(message, sender)
    .then(response => {
      console.log('[Offscreen] Sending response:', response);
      sendResponse(response);
    })
    .catch(error => {
      console.error('[Offscreen] Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

  // Return true to indicate we'll send a response asynchronously
  return true;
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'INIT_FFMPEG':
      return await initializeFFmpeg();

    case 'CONVERT_VIDEO':
      return await convertVideo(message.payload);

    case 'PING':
      return { success: true, message: 'pong' };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Initialize FFmpeg
 */
async function initializeFFmpeg() {
  if (isLoaded) {
    console.log('[Offscreen] FFmpeg already loaded');
    return { success: true, message: 'FFmpeg already loaded' };
  }

  try {
    console.log('[Offscreen] Initializing FFmpeg...');

    ffmpeg = new FFmpeg();

    // Load FFmpeg from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

    console.log('[Offscreen] Loading FFmpeg core...');

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    // Set up logging
    ffmpeg.on('log', ({ type, message }) => {
      if (type === 'error') {
        console.error('[FFmpeg]', message);
      }
    });

    isLoaded = true;
    console.log('[Offscreen] FFmpeg loaded successfully');

    return { success: true, message: 'FFmpeg initialized' };
  } catch (error) {
    console.error('[Offscreen] Failed to initialize FFmpeg:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize FFmpeg'
    };
  }
}

/**
 * Convert video using FFmpeg
 */
async function convertVideo(payload: {
  videoData: string; // Base64 encoded video
  format: 'gif' | 'mp4' | 'webm';
  fps: number;
  width: number;
  quality: 'low' | 'medium' | 'high';
}) {
  if (!ffmpeg || !isLoaded) {
    return {
      success: false,
      error: 'FFmpeg not initialized'
    };
  }

  try {
    console.log('[Offscreen] Starting conversion...', {
      format: payload.format,
      fps: payload.fps,
      width: payload.width,
      quality: payload.quality
    });

    // Decode base64 video data
    const videoData = Uint8Array.from(atob(payload.videoData), c => c.charCodeAt(0));

    // Write input file to FFmpeg virtual filesystem
    await ffmpeg.writeFile('input.webm', videoData);

    // Build FFmpeg command
    const outputFile = `output.${payload.format}`;
    const ffmpegArgs = buildFFmpegArgs(payload, outputFile);

    console.log('[Offscreen] Running FFmpeg with args:', ffmpegArgs);

    // Run conversion
    await ffmpeg.exec(ffmpegArgs);

    // Read output file
    const outputData = await ffmpeg.readFile(outputFile);

    // Clean up
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile(outputFile);

    // Convert to base64 for transmission
    const base64Output = btoa(
      Array.from(new Uint8Array(outputData as Uint8Array))
        .map(byte => String.fromCharCode(byte))
        .join('')
    );

    console.log('[Offscreen] Conversion complete, output size:', outputData.byteLength);

    return {
      success: true,
      data: base64Output,
      mimeType: getMimeType(payload.format)
    };
  } catch (error) {
    console.error('[Offscreen] Conversion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed'
    };
  }
}

/**
 * Build FFmpeg arguments based on settings
 */
function buildFFmpegArgs(
  options: { format: string; fps: number; width: number; quality: string },
  outputFile: string
): string[] {
  const args = ['-i', 'input.webm'];

  // Set FPS
  args.push('-r', options.fps.toString());

  // Scale video width (maintain aspect ratio)
  args.push('-vf', `scale=${options.width}:-1`);

  if (options.format === 'gif') {
    // GIF-specific settings
    const dither = options.quality === 'high' ? 'sierra2_4a' : options.quality === 'medium' ? 'floyd_steinberg' : 'none';

    args.push(
      '-vf',
      `scale=${options.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=${dither}`,
      '-loop',
      '0'
    );
  } else if (options.format === 'mp4') {
    // MP4-specific settings
    const crf = options.quality === 'high' ? '18' : options.quality === 'medium' ? '23' : '28';

    args.push(
      '-c:v', 'libx264',
      '-crf', crf,
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart'
    );
  } else if (options.format === 'webm') {
    // WebM-specific settings
    const crf = options.quality === 'high' ? '10' : options.quality === 'medium' ? '23' : '35';

    args.push(
      '-c:v', 'libvpx-vp9',
      '-crf', crf,
      '-b:v', '0'
    );
  }

  args.push(outputFile);

  return args;
}

/**
 * Get MIME type for output format
 */
function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return mimeTypes[format] || 'application/octet-stream';
}
