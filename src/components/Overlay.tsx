import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { YouTubeClipInfo } from '../utils/youtubeParser';
import { formatTime, getClipDuration } from '../utils/youtubeParser';
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
  const [settings, setSettings] = useState({
    format: 'gif' as 'gif' | 'mp4' | 'webm',
    fps: 15,
    width: 480,
    quality: 'medium' as 'low' | 'medium' | 'high'
  });

  const clipDuration = getClipDuration(clipInfo);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setSettings({
          ...settings,
          fps: result.settings.defaultFps,
          width: result.settings.defaultWidth,
          quality: result.settings.gifQuality
        });
      }
    });
  }, []);

  const handleStartConversion = async () => {
    setStatus('preparing');
    setProgress(0);
    setErrorMessage('');

    try {
      // This will be implemented in the next steps
      // For now, just simulate the process
      setStatus('downloading');
      await simulateProgress(0, 30);

      setStatus('converting');
      await simulateProgress(30, 90);

      setStatus('complete');
      setProgress(100);

      console.log('Conversion complete!', { clipInfo, settings });
    } catch (error) {
      console.error('Conversion error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const simulateProgress = (start: number, end: number): Promise<void> => {
    return new Promise((resolve) => {
      let current = start;
      const interval = setInterval(() => {
        current += 2;
        setProgress(Math.min(current, end));
        if (current >= end) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
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
          </div>

          {/* Settings */}
          {status === 'idle' && (
            <div className="ytgif-settings">
              <div className="ytgif-setting-item">
                <label>Format</label>
                <div className="ytgif-format-buttons">
                  <button
                    className={`ytgif-format-btn ${settings.format === 'gif' ? 'active' : ''}`}
                    onClick={() => setSettings({ ...settings, format: 'gif' })}
                  >
                    GIF
                  </button>
                  <button
                    className={`ytgif-format-btn ${settings.format === 'mp4' ? 'active' : ''}`}
                    onClick={() => setSettings({ ...settings, format: 'mp4' })}
                  >
                    MP4
                  </button>
                  <button
                    className={`ytgif-format-btn ${settings.format === 'webm' ? 'active' : ''}`}
                    onClick={() => setSettings({ ...settings, format: 'webm' })}
                  >
                    WebM
                  </button>
                </div>
              </div>

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
                {status === 'preparing' && 'Preparing...'}
                {status === 'downloading' && 'Downloading video...'}
                {status === 'converting' && 'Converting to GIF...'}
                {status === 'complete' && '✅ Complete!'}
              </p>
              <p className="ytgif-progress-percent">{progress}%</p>
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
              <button className="ytgif-btn-primary">
                💾 Download
              </button>
              <button
                className="ytgif-btn-secondary"
                onClick={() => setStatus('idle')}
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
