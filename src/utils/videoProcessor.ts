/**
 * Video Processing Utility
 * Handles video capture from YouTube and GIF conversion using gifenc
 */

import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface ConversionOptions {
  fps: number;
  width: number;
  quality: 'low' | 'medium' | 'high';
  startTime: number;
  duration: number;
}

export interface ConversionProgress {
  phase: 'initializing' | 'capturing' | 'processing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export class VideoProcessor {
  private onProgress?: (progress: ConversionProgress) => void;

  constructor() {
    // No initialization needed
  }

  /**
   * Update progress callback
   */
  private updateProgress(phase: ConversionProgress['phase'], progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ phase, progress, message });
    }
  }

  /**
   * Capture frames from video and convert to GIF
   */
  async processVideo(
    options: ConversionOptions,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<Blob> {
    this.onProgress = onProgress;

    try {
      this.updateProgress('capturing', 0, 'Finding video player...');

      // Find the YouTube video element
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (!videoElement) {
        throw new Error('Video player not found');
      }

      // Calculate quality settings (max colors for palette)
      const qualityMap = {
        low: { maxColors: 128 },
        medium: { maxColors: 256 },
        high: { maxColors: 256 }
      };
      const settings = qualityMap[options.quality];

      this.updateProgress('capturing', 10, 'Preparing capture...');

      // Create canvas for capturing frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      // Calculate dimensions (maintain aspect ratio)
      const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
      canvas.width = options.width;
      canvas.height = Math.round(options.width / videoAspect);

      console.log('[VideoProcessor] Canvas size:', canvas.width, 'x', canvas.height);

      // Seek to start time
      videoElement.currentTime = options.startTime;
      await new Promise(resolve => {
        videoElement.addEventListener('seeked', resolve, { once: true });
      });

      // Pause the video to control frame capture
      const wasPlaying = !videoElement.paused;
      videoElement.pause();

      this.updateProgress('capturing', 20, 'Capturing frames...');

      // Capture frames
      const frameDuration = 1 / options.fps; // Time per frame in seconds
      const totalFrames = Math.ceil(options.duration * options.fps);
      const frames: Uint8ClampedArray[] = [];

      console.log('[VideoProcessor] Capturing', totalFrames, 'frames at', options.fps, 'fps');

      for (let i = 0; i < totalFrames; i++) {
        const targetTime = options.startTime + (i * frameDuration);

        // Seek to exact frame time
        videoElement.currentTime = targetTime;
        await new Promise(resolve => {
          videoElement.addEventListener('seeked', resolve, { once: true });
        });

        // Draw current frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Get RGBA pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        frames.push(imageData.data);

        // Update progress
        const captureProgress = 20 + ((i / totalFrames) * 30);
        this.updateProgress('capturing', captureProgress, `Captured ${i + 1}/${totalFrames} frames`);
      }

      // Restore video state
      if (wasPlaying) {
        videoElement.play();
      }

      this.updateProgress('processing', 50, 'Encoding GIF...');

      // Create GIF encoder
      const gif = GIFEncoder();

      console.log('[VideoProcessor] Encoding', frames.length, 'frames...');

      // Encode frames
      const delay = Math.round((1000 / options.fps) / 10); // gifenc uses centiseconds (1/100 sec)

      for (let i = 0; i < frames.length; i++) {
        // Quantize colors for this frame
        const palette = quantize(frames[i], settings.maxColors, { format: 'rgb565' });

        // Convert RGBA pixels to palette indices
        const index = applyPalette(frames[i], palette, 'rgb565');

        // Write frame to GIF
        gif.writeFrame(index, canvas.width, canvas.height, {
          palette,
          delay,
          repeat: 0, // Loop forever
          transparent: false
        });

        // Update progress
        const encodeProgress = 50 + ((i / frames.length) * 50);
        this.updateProgress('processing', encodeProgress, `Encoding frame ${i + 1}/${frames.length}`);
      }

      // Finish encoding
      gif.finish();

      // Get the GIF bytes and create a Blob
      const buffer = gif.bytes();
      const gifBlob = new Blob([buffer], { type: 'image/gif' });

      console.log('[VideoProcessor] GIF encoded, size:', gifBlob.size);

      this.updateProgress('complete', 100, 'GIF created successfully!');
      return gifBlob;

    } catch (error) {
      console.error('[VideoProcessor] Processing failed:', error);
      throw new Error(`Failed to create GIF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Create a download link for a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
