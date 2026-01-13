import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { isYouTubeClipPage } from '../utils/youtubeParser';
import './popup.css';

interface Settings {
  gifQuality: 'low' | 'medium' | 'high';
  maxDuration: number;
  defaultFps: number;
  defaultWidth: number;
}

function Popup() {
  const [settings, setSettings] = useState<Settings>({
    gifQuality: 'medium',
    maxDuration: 15,
    defaultFps: 15,
    defaultWidth: 480
  });

  const [isOnClipPage, setIsOnClipPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });

    // Check if current tab is a YouTube clip page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const url = tabs[0].url || '';
        setCurrentTabId(tabs[0].id || null);
        setIsOnClipPage(isYouTubeClipPage(url));
      }
    });
  }, []);

  const handleSaveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      console.log('Settings saved:', settings);
      // Show success message
      const successMsg = document.getElementById('success-message');
      if (successMsg) {
        successMsg.style.display = 'block';
        setTimeout(() => {
          successMsg.style.display = 'none';
        }, 2000);
      }
    });
  };

  const handleCreateGif = async () => {
    if (!currentTabId) {
      setErrorMessage('Unable to access current tab');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Send message to content script to open overlay
      const response = await chrome.tabs.sendMessage(currentTabId, {
        type: 'OPEN_OVERLAY'
      });

      if (response && response.success) {
        console.log('[Popup] Overlay opened successfully');
        // Close the popup after successfully opening overlay
        window.close();
      } else {
        setErrorMessage(response?.error || 'Failed to open GIF creator');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[Popup] Error opening overlay:', error);
      setErrorMessage('Failed to communicate with the page. Please refresh and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1 className="popup-title">🎬 YouTube to GIF</h1>
        <p className="popup-subtitle">Convert YouTube clips to GIFs</p>
      </div>

      <div className="popup-content">
        {!isOnClipPage && (
          <div className="info-box">
            <p>📍 Navigate to a YouTube clip to get started!</p>
            <p className="info-detail">
              Use YouTube's "Share → Clip" feature to create a clip, then click the extension icon.
            </p>
          </div>
        )}

        {isOnClipPage && (
          <>
            <div className="info-box success">
              <p>✅ Clip detected!</p>
              <p className="info-detail">
                Click the button below to create a GIF from this clip.
              </p>
            </div>

            <button
              className="create-gif-button"
              onClick={handleCreateGif}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Opening...' : '🚀 Create GIF from Clip'}
            </button>

            {errorMessage && (
              <div className="error-box">
                <p>❌ {errorMessage}</p>
              </div>
            )}
          </>
        )}

        <div className="settings-section">
          <h2 className="section-title">Settings</h2>

          <div className="setting-item">
            <label htmlFor="quality">GIF Quality</label>
            <select
              id="quality"
              value={settings.gifQuality}
              onChange={(e) =>
                setSettings({ ...settings, gifQuality: e.target.value as any })
              }
            >
              <option value="low">Low (Smaller file)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (Better quality)</option>
            </select>
          </div>

          <div className="setting-item">
            <label htmlFor="fps">Frame Rate (FPS)</label>
            <input
              id="fps"
              type="number"
              min="10"
              max="30"
              value={settings.defaultFps}
              onChange={(e) =>
                setSettings({ ...settings, defaultFps: parseInt(e.target.value) })
              }
            />
            <small>Lower FPS = smaller file size</small>
          </div>

          <div className="setting-item">
            <label htmlFor="width">Width (pixels)</label>
            <input
              id="width"
              type="number"
              min="240"
              max="1920"
              step="80"
              value={settings.defaultWidth}
              onChange={(e) =>
                setSettings({ ...settings, defaultWidth: parseInt(e.target.value) })
              }
            />
            <small>Recommended: 480-720px</small>
          </div>

          <div className="setting-item">
            <label htmlFor="maxDuration">Max Clip Duration (seconds)</label>
            <input
              id="maxDuration"
              type="number"
              min="5"
              max="60"
              value={settings.maxDuration}
              onChange={(e) =>
                setSettings({ ...settings, maxDuration: parseInt(e.target.value) })
              }
            />
            <small>Longer clips = larger files</small>
          </div>

          <button className="save-button" onClick={handleSaveSettings}>
            Save Settings
          </button>

          <div id="success-message" className="success-message">
            ✓ Settings saved!
          </div>
        </div>

        <div className="footer">
          <p className="footer-text">
            <a href="https://github.com/dartmouth-cs98/pre-project-FelipePavanelliBR" target="_blank">
              View on GitHub
            </a>
          </p>
          <p className="footer-disclaimer">
            For personal use only. Respect copyright.
          </p>
        </div>
      </div>
    </div>
  );
}

// Render the popup
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
