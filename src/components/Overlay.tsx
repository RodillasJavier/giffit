import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { YouTubeClipInfo } from '../utils/youtubeParser';
import { formatTime, getClipDuration } from '../utils/youtubeParser';
import { VideoProcessor, downloadBlob, formatFileSize as formatBytes } from '../utils/videoProcessor';
import type { ConversionProgress } from '../utils/videoProcessor';
import './overlay.css';

interface OverlayProps {
  clipInfo: YouTubeClipInfo;
}

type ConversionStatus = 'idle' | 'preparing' | 'downloading' | 'converting' | 'complete' | 'error';

function Overlay({ clipInfo }: OverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputSize, setOutputSize] = useState<string>('');
  const [settings, setSettings] = useState({
    fps: 15,
    width: 480,
    quality: 'medium' as 'low' | 'medium' | 'high'
  });

  const processorRef = useRef<VideoProcessor | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualStartTime, setManualStartTime] = useState(0);
  const [manualEndTime, setManualEndTime] = useState(10);

  const clipDuration = getClipDuration(clipInfo);

  // Check if we need manual mode
  useEffect(() => {
    if (clipInfo.startTime === null || clipInfo.endTime === null) {
      console.log('[Overlay] Missing clip times, enabling manual mode');
      setManualMode(true);

      // Try to get current video position as a starting point
      const video = document.querySelector('video');
      if (video) {
        setManualStartTime(Math.floor(video.currentTime || 0));
        setManualEndTime(Math.floor((video.currentTime || 0) + 10));
      }
    }
  }, [clipInfo]);

  useEffect(() => {
    // Load settings from storage
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartConversion = async () => {
    setStatus('preparing');
    setProgress(0);
    setErrorMessage('');
    setOutputBlob(null);
    setStatusMessage('Initializing...');

    // Use manual times if in manual mode
    let startTime = clipInfo.startTime;
    let endTime = clipInfo.endTime;
    let duration = clipDuration;

    if (manualMode) {
      startTime = manualStartTime;
      endTime = manualEndTime;
      duration = endTime - startTime;

      // Validate manual inputs
      if (startTime < 0 || endTime <= startTime) {
        setStatus('error');
        setErrorMessage('Invalid time range. End time must be greater than start time.');
        return;
      }
    } else {
      // Validate clip info
      if (startTime === null || duration === null) {
        setStatus('error');
        setErrorMessage('Invalid clip information. Please switch to manual mode or try refreshing the page.');
        return;
      }
    }

    // Check duration limit (max 60 seconds for performance)
    if (duration > 60) {
      setStatus('error');
      setErrorMessage('Clip is too long! Please use clips shorter than 60 seconds for best results.');
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
        startTime: startTime!,
        duration: duration!
      }, onProgress);

      // Store the result
      setOutputBlob(blob);
      setOutputSize(formatBytes(blob.size));
      setStatus('complete');
      setProgress(100);
      setStatusMessage('Conversion complete!');

      console.log('[Overlay] GIF creation complete!', {
        size: blob.size,
        clipInfo
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

  const handleDownload = () => {
    if (!outputBlob) {
      console.error('[Overlay] No output blob to download');
      return;
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `youtube-clip-${clipInfo.videoId || 'clip'}-${timestamp}.gif`;

    // Trigger download
    downloadBlob(outputBlob, filename);
    console.log('[Overlay] Downloaded:', filename);
  };

  const handleClose = () => {
    // Remove the overlay
    const overlayRoot = document.getElementById('ytgif-overlay-root');
    if (overlayRoot) {
      overlayRoot.remove();
    }
  };

  const formatFileSize = (duration: number | null, width: number, fps: number): string => {
    if (!duration) return 'Unknown';
    // Rough estimate: GIF is ~500KB per second at 480p, 15fps
    const sizePerSecond = (width / 480) * (fps / 15) * 500;
    const totalKB = duration * sizePerSecond;

    if (totalKB > 1024) {
      return `~${(totalKB / 1024).toFixed(1)} MB`;
    }
    return `~${totalKB.toFixed(0)} KB`;
  };

  if (!isExpanded) {
    return (
      <div className="ytgif-compact-button" onClick={() => setIsExpanded(true)}>
        <span className="ytgif-icon">🎬</span>
        <span className="ytgif-text">Create GIF</span>
      </div>
    );
  }

  return (
    <div className="ytgif-overlay">
      <div className="ytgif-card">
        <div className="ytgif-header">
          <h2 className="ytgif-title">Create GIF from Clip</h2>
          <button className="ytgif-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="ytgif-body">
          {/* Clip Info */}
          <div className="ytgif-clip-info">
            {manualMode ? (
              <>
                <div className="ytgif-manual-notice">
                  ⚠️ Manual mode: Set your clip times below
                </div>
                <div className="ytgif-manual-inputs">
                  <div className="ytgif-time-input">
                    <label>Start Time (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(Number(e.target.value))}
                      disabled={status !== 'idle'}
                    />
                  </div>
                  <div className="ytgif-time-input">
                    <label>End Time (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(Number(e.target.value))}
                      disabled={status !== 'idle'}
                    />
                  </div>
                </div>
                <div className="ytgif-info-row">
                  <span className="ytgif-label">Duration:</span>
                  <span className="ytgif-value">
                    {formatTime(manualEndTime - manualStartTime)}
                  </span>
                </div>
                <div className="ytgif-info-row">
                  <span className="ytgif-label">Estimated Size:</span>
                  <span className="ytgif-value">
                    {formatFileSize(manualEndTime - manualStartTime, settings.width, settings.fps)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="ytgif-info-row">
                  <span className="ytgif-label">Duration:</span>
                  <span className="ytgif-value">
                    {clipDuration ? formatTime(clipDuration) : 'Unknown'}
                  </span>
                </div>
                {clipInfo.startTime !== null && (
                  <div className="ytgif-info-row">
                    <span className="ytgif-label">Time Range:</span>
                    <span className="ytgif-value">
                      {formatTime(clipInfo.startTime)} - {formatTime(clipInfo.endTime || 0)}
                    </span>
                  </div>
                )}
                <div className="ytgif-info-row">
                  <span className="ytgif-label">Estimated Size:</span>
                  <span className="ytgif-value">
                    {formatFileSize(clipDuration, settings.width, settings.fps)}
                  </span>
                </div>
                <button
                  className="ytgif-btn-link"
                  onClick={() => {
                    setManualMode(true);
                    const video = document.querySelector('video');
                    if (video) {
                      setManualStartTime(Math.floor(video.currentTime || 0));
                      setManualEndTime(Math.floor((video.currentTime || 0) + 10));
                    }
                  }}
                >
                  Switch to manual mode
                </button>
              </>
            )}
          </div>

          {/* Settings */}
          {status === 'idle' && (
            <div className="ytgif-settings">
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

              <div className="ytgif-setting-row">
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
              </div>
            </div>
          )}

          {/* Progress */}
          {status !== 'idle' && status !== 'error' && (
            <div className="ytgif-progress-section">
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
            <div className="ytgif-error">
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
          {status === 'idle' && (
            <button className="ytgif-btn-primary" onClick={handleStartConversion}>
              🚀 Start Conversion
            </button>
          )}

          {status === 'complete' && (
            <div className="ytgif-complete-actions">
              <button className="ytgif-btn-primary" onClick={handleDownload}>
                💾 Download GIF
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
            </div>
          )}
        </div>

        <div className="ytgif-footer">
          <p className="ytgif-disclaimer">
            ⚠️ For personal use only. Respect copyright laws.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Overlay;

// Initialize the overlay when this script is loaded
export function initOverlay(clipInfo: YouTubeClipInfo) {
  const container = document.getElementById('ytgif-overlay-root');
  if (container) {
    const root = createRoot(container);
    root.render(<Overlay clipInfo={clipInfo} />);
  }
}
