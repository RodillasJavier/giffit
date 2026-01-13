import React, { useState, useEffect } from 'react';

interface VideoPreviewProps {
  videoSrc: string;
  startTime: number;
  endTime: number;
}

/**
 * Video preview component that controls the main YouTube player
 * instead of creating a separate video element
 */
export function VideoPreview({ startTime, endTime }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  // Get the main YouTube video element
  const getYouTubeVideo = (): HTMLVideoElement | null => {
    return document.querySelector('video');
  };

  // Check if video exists on mount
  useEffect(() => {
    const video = getYouTubeVideo();
    setHasVideo(!!video);
  }, []);

  // Track video playback state
  useEffect(() => {
    const video = getYouTubeVideo();
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initial state
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  /**
   * Seek to start time
   */
  const seekToStart = () => {
    const video = getYouTubeVideo();
    if (!video) return;

    video.currentTime = startTime;
    setCurrentTime(startTime);
  };

  /**
   * Seek to end time
   */
  const seekToEnd = () => {
    const video = getYouTubeVideo();
    if (!video) return;

    video.currentTime = endTime;
    setCurrentTime(endTime);
  };

  /**
   * Play the selected range
   */
  const playSelection = () => {
    const video = getYouTubeVideo();
    if (!video) return;

    video.currentTime = startTime;
    video.play();
  };

  /**
   * Pause playback
   */
  const pausePlayback = () => {
    const video = getYouTubeVideo();
    if (!video) return;

    video.pause();
  };

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isInRange = currentTime >= startTime && currentTime <= endTime;
  const duration = endTime - startTime;

  if (!hasVideo) {
    return (
      <div className="video-preview-controls-only">
        <div className="video-preview-error">
          <span>⚠️ Video player not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview-controls-only">
      {/* Range Info */}
      <div className="video-preview-info">
        <div className="video-preview-info-row">
          <span className="video-preview-info-label">Selected Range:</span>
          <span className="video-preview-info-value">
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>
        <div className="video-preview-info-row">
          <span className="video-preview-info-label">Duration:</span>
          <span className="video-preview-info-value">
            {formatTime(duration)}
          </span>
        </div>
        {isInRange && (
          <div className="video-preview-info-indicator">
            ✓ Currently in selected range
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="video-preview-controls">
        <button
          className="video-preview-btn video-preview-btn-seek"
          onClick={seekToStart}
          title="Seek to start"
        >
          ⏮
        </button>

        <button
          className="video-preview-btn video-preview-btn-play"
          onClick={isPlaying ? pausePlayback : playSelection}
          title={isPlaying ? 'Pause' : 'Play selection'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="video-preview-btn video-preview-btn-seek"
          onClick={seekToEnd}
          title="Seek to end"
        >
          ⏭
        </button>
      </div>

      <div className="video-preview-hint">
        💡 Controls affect the main YouTube player above
      </div>
    </div>
  );
}
