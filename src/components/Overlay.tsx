import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { formatTime } from '../utils/youtubeParser';
import { VideoProcessor, downloadBlob, formatFileSize as formatBytes } from '../utils/videoProcessor';
import type { ConversionProgress } from '../utils/videoProcessor';
import { Timeline } from './Timeline';
import { VideoPreview } from './VideoPreview';
import './overlay.css';

interface VideoInfo {
  videoId: string | null;
  duration: number;
  currentTime: number;
  src: string;
}

interface OverlayProps {
  videoInfo: VideoInfo;
}

type ConversionStatus = 'idle' | 'preparing' | 'downloading' | 'converting' | 'complete' | 'error';

const MAX_GIF_DURATION = 15; // Maximum GIF duration in seconds

function Overlay({ videoInfo }: OverlayProps) {
  // Video trimming state
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(MAX_GIF_DURATION, videoInfo.duration));

  // Conversion state
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputSize, setOutputSize] = useState<string>('');

  // Settings state
  const [settings, setSettings] = useState({
    fps: 15,
    width: 480,
    quality: 'medium' as 'low' | 'medium' | 'high'
  });

  const processorRef = useRef<VideoProcessor | null>(null);

  // Initialize start/end times based on video current time or start of video
  useEffect(() => {
    const initialStart = Math.floor(videoInfo.currentTime || 0);
    const initialEnd = Math.min(
      initialStart + MAX_GIF_DURATION,
      videoInfo.duration
    );
    setStartTime(initialStart);
    setEndTime(initialEnd);
  }, [videoInfo]);

  // Load settings from storage
  useEffect(() => {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setSettings((prev) => ({
          ...prev,
          fps: result.settings.defaultFps || prev.fps,
          width: result.settings.defaultWidth || prev.width,
          quality: result.settings.gifQuality || prev.quality
        }));
      }
    });
  }, []);

  /**
   * Handle start time change from timeline
   * Enforce 15-second max constraint
   */
  const handleStartTimeChange = (newStartTime: number) => {
    const maxStart = Math.max(0, Math.min(newStartTime, endTime - 0.1));

    // If this would make duration > 15s, adjust end too
    if (endTime - maxStart > MAX_GIF_DURATION) {
      setEndTime(maxStart + MAX_GIF_DURATION);
    }

    setStartTime(maxStart);
  };

  /**
   * Handle end time change from timeline
   * Enforce 15-second max constraint
   */
  const handleEndTimeChange = (newEndTime: number) => {
    const maxEnd = Math.min(
      newEndTime,
      startTime + MAX_GIF_DURATION,  // Max 15s from start
      videoInfo.duration             // Can't exceed video
    );
    setEndTime(maxEnd);
  };

  /**
   * Start GIF conversion
   */
  const handleStartConversion = async () => {
    setStatus('preparing');
    setProgress(0);
    setErrorMessage('');
    setOutputBlob(null);
    setStatusMessage('Initializing...');

    const duration = endTime - startTime;

    // Validate duration
    if (duration <= 0) {
      setStatus('error');
      setErrorMessage('Invalid time range. End time must be greater than start time.');
      return;
    }

    if (duration > MAX_GIF_DURATION) {
      setStatus('error');
      setErrorMessage(`Duration cannot exceed ${MAX_GIF_DURATION} seconds.`);
      return;
    }

    try {
      // Create processor instance
      if (!processorRef.current) {
        processorRef.current = new VideoProcessor();
      }

      const processor = processorRef.current;

      // Progress callback to update UI
      const onProgress = (progressInfo: ConversionProgress) => {
        setStatusMessage(progressInfo.message);
        setProgress(progressInfo.progress);

        // Map phases to our status types
        if (progressInfo.phase === 'initializing') {
          setStatus('preparing');
        } else if (progressInfo.phase === 'capturing') {
          setStatus('downloading');
        } else if (progressInfo.phase === 'processing') {
          setStatus('converting');
        } else if (progressInfo.phase === 'complete') {
          setStatus('complete');
        }
      };

      // Process the video
      const blob = await processor.processVideo({
        fps: settings.fps,
        width: settings.width,
        quality: settings.quality,
        startTime: startTime,
        duration: duration
      }, onProgress);

      // Store the result
      setOutputBlob(blob);
      setOutputSize(formatBytes(blob.size));
      setStatus('complete');
      setProgress(100);
      setStatusMessage('Conversion complete!');

      console.log('[Overlay] GIF creation complete!', {
        size: blob.size,
        videoInfo
      });
    } catch (error) {
      console.error('[Overlay] Conversion error:', error);
      setStatus('error');

      let errorMsg = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMsg = error.message;

        // Provide more helpful error messages
        if (errorMsg.includes('Failed to initialize video processor')) {
          errorMsg = 'Failed to load video processor. Please check your internet connection and try again.';
        } else if (errorMsg.includes('Video player not found')) {
          errorMsg = 'Could not find the video player. Please make sure the video is playing.';
        }
      }

      setErrorMessage(errorMsg);
    }
  };

  /**
   * Download the generated GIF
   */
  const handleDownload = () => {
    if (!outputBlob) {
      console.error('[Overlay] No output blob to download');
      return;
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `youtube-gif-${videoInfo.videoId || 'video'}-${timestamp}.gif`;

    // Trigger download
    downloadBlob(outputBlob, filename);
    console.log('[Overlay] Downloaded:', filename);
  };

  /**
   * Close the overlay
   */
  const handleClose = () => {
    const overlayRoot = document.getElementById('ytgif-overlay-root');
    if (overlayRoot) {
      overlayRoot.classList.remove('visible');
      setTimeout(() => overlayRoot.remove(), 300); // Wait for animation
    }
  };

  /**
   * Estimate GIF file size
   */
  const formatFileSize = (duration: number, width: number, fps: number): string => {
    // Rough estimate: GIF is ~500KB per second at 480p, 15fps
    const sizePerSecond = (width / 480) * (fps / 15) * 500;
    const totalKB = duration * sizePerSecond;

    if (totalKB > 1024) {
      return `~${(totalKB / 1024).toFixed(1)} MB`;
    }
    return `~${totalKB.toFixed(0)} KB`;
  };

  const selectedDuration = endTime - startTime;

  return (
    <div className="ytgif-sidebar">
      {/* Header */}
      <div className="ytgif-sidebar-header">
        <h2 className="ytgif-sidebar-title">Giffit</h2>
        <button className="ytgif-close-btn" onClick={handleClose}>
          ✕
        </button>
      </div>

      <div className="ytgif-sidebar-body">
        {/* Video Controls */}
        <div className="ytgif-section">
          <h3 className="ytgif-section-title">Video Controls</h3>
          <VideoPreview
            videoSrc={videoInfo.src}
            startTime={startTime}
            endTime={endTime}
          />
        </div>

        {/* Timeline */}
        <div className="ytgif-section">
          <h3 className="ytgif-section-title">Select Range (max {MAX_GIF_DURATION}s)</h3>
          <Timeline
            videoDuration={videoInfo.duration}
            startTime={startTime}
            endTime={endTime}
            onStartChange={handleStartTimeChange}
            onEndChange={handleEndTimeChange}
            fps={settings.fps}
          />
          <div className="ytgif-duration-display">
            <span className="ytgif-duration-label">Selected:</span>
            <span className="ytgif-duration-value">
              {formatTime(selectedDuration)}
            </span>
            <span className="ytgif-duration-remaining">
              / {MAX_GIF_DURATION}s max
            </span>
          </div>
        </div>

        {/* Settings */}
        {status === 'idle' && (
          <div className="ytgif-section ytgif-settings">
            <h3 className="ytgif-section-title">Settings</h3>

            <div className="ytgif-setting-item">
              <label>Quality</label>
              <select
                value={settings.quality}
                onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
              >
                <option value="low">Low (Smaller file)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Best quality)</option>
              </select>
            </div>

            <div className="ytgif-setting-item">
              <label>FPS: {settings.fps}</label>
              <input
                type="range"
                min="10"
                max="30"
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: parseInt(e.target.value) })}
              />
            </div>

            <div className="ytgif-setting-item">
              <label>Width: {settings.width}px</label>
              <input
                type="range"
                min="240"
                max="1280"
                step="80"
                value={settings.width}
                onChange={(e) => setSettings({ ...settings, width: parseInt(e.target.value) })}
              />
            </div>

            <div className="ytgif-info-row">
              <span className="ytgif-label">Estimated Size:</span>
              <span className="ytgif-value">
                {formatFileSize(selectedDuration, settings.width, settings.fps)}
              </span>
            </div>
          </div>
        )}

        {/* Progress */}
        {status !== 'idle' && status !== 'error' && (
          <div className="ytgif-section ytgif-progress-section">
            <div className="ytgif-progress-bar">
              <div
                className="ytgif-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="ytgif-status-text">
              {statusMessage || (
                <>
                  {status === 'preparing' && 'Preparing...'}
                  {status === 'downloading' && 'Capturing frames...'}
                  {status === 'converting' && 'Encoding GIF...'}
                  {status === 'complete' && '✅ Complete!'}
                </>
              )}
            </p>
            <p className="ytgif-progress-percent">{progress}%</p>
            {status === 'complete' && outputSize && (
              <p className="ytgif-file-size">File size: {outputSize}</p>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="ytgif-section ytgif-error">
            <p className="ytgif-error-title">❌ Error</p>
            <p className="ytgif-error-message">{errorMessage}</p>
            <button
              className="ytgif-btn-secondary"
              onClick={() => setStatus('idle')}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="ytgif-section ytgif-actions">
          {status === 'idle' && (
            <button
              className="ytgif-btn-primary"
              onClick={handleStartConversion}
              disabled={selectedDuration <= 0 || selectedDuration > MAX_GIF_DURATION}
            >
              🎬 Convert to GIF
            </button>
          )}

          {status === 'complete' && (
            <>
              <button className="ytgif-btn-primary" onClick={handleDownload}>
                ⬇️ Download GIF
              </button>
              <button
                className="ytgif-btn-secondary"
                onClick={() => {
                  setStatus('idle');
                  setOutputBlob(null);
                  setProgress(0);
                }}
              >
                Create Another
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="ytgif-sidebar-footer">
        <p className="ytgif-disclaimer">
          ⚠️ For personal use only. Respect copyright laws.
        </p>
      </div>
    </div>
  );
}

export default Overlay;

// Initialize the overlay when this script is loaded
export function initOverlay(videoInfo: VideoInfo) {
  const container = document.getElementById('ytgif-overlay-root');
  if (container) {
    const root = createRoot(container);
    root.render(<Overlay videoInfo={videoInfo} />);
  }
}
