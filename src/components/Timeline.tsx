import React, { useRef, useState, useEffect } from 'react';

interface TimelineProps {
  videoDuration: number; // Total video length in seconds
  startTime: number;
  endTime: number;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  fps?: number; // For frame-accurate snapping (optional)
}

type DragHandle = 'start' | 'end' | null;

// Pixels per second - determines zoom level
// 20px/sec means 15 seconds = 300px (comfortable width)
const PIXELS_PER_SECOND = 20;
const MAX_GIF_DURATION = 15;

/**
 * Timeline component for selecting start/end times
 * Visual representation with draggable handles and horizontal scroll for precision
 */
export function Timeline({
  videoDuration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  fps = 30
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);

  // Calculate total track width based on video duration
  // This makes the timeline scrollable for long videos
  const trackWidth = videoDuration * PIXELS_PER_SECOND;

  // Calculate positions in pixels
  const startPos = startTime * PIXELS_PER_SECOND;
  const endPos = endTime * PIXELS_PER_SECOND;
  const selectedWidth = endPos - startPos;

  // Auto-scroll to keep selection visible when handles change
  useEffect(() => {
    if (!wrapperRef.current || dragging) return;

    const wrapper = wrapperRef.current;
    const wrapperWidth = wrapper.clientWidth;
    const scrollLeft = wrapper.scrollLeft;

    // Check if selection is fully visible
    const selectionStart = startPos;
    const selectionEnd = endPos;

    // If start is before visible area, scroll left
    if (selectionStart < scrollLeft) {
      wrapper.scrollTo({
        left: Math.max(0, selectionStart - 50),
        behavior: 'smooth'
      });
    }
    // If end is after visible area, scroll right
    else if (selectionEnd > scrollLeft + wrapperWidth) {
      wrapper.scrollTo({
        left: selectionEnd - wrapperWidth + 50,
        behavior: 'smooth'
      });
    }
  }, [startTime, endTime, dragging, startPos, endPos]);

  /**
   * Format seconds to MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Calculate time from mouse position
   * Accounts for horizontal scroll position
   */
  const getTimeFromMouseEvent = (e: React.MouseEvent | MouseEvent): number => {
    if (!trackRef.current || !wrapperRef.current) return 0;

    const rect = trackRef.current.getBoundingClientRect();
    const scrollLeft = wrapperRef.current.scrollLeft;

    // Get mouse position relative to track, accounting for scroll
    const x = e.clientX - rect.left + scrollLeft;

    // Convert pixel position to time
    const time = x / PIXELS_PER_SECOND;

    // Optionally snap to frame boundaries
    const frameDuration = 1 / fps;
    const snappedTime = Math.round(time / frameDuration) * frameDuration;

    return Math.max(0, Math.min(videoDuration, snappedTime));
  };

  /**
   * Handle mouse down on start handle
   */
  const handleStartMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging('start');
  };

  /**
   * Handle mouse down on end handle
   */
  const handleEndMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging('end');
  };

  /**
   * Handle mouse move for dragging
   */
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;

    const newTime = getTimeFromMouseEvent(e);

    if (dragging === 'start') {
      onStartChange(newTime);
    } else if (dragging === 'end') {
      onEndChange(newTime);
    }
  };

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = () => {
    setDragging(null);
  };

  /**
   * Handle click on track to move nearest handle
   */
  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return; // Don't handle clicks while dragging

    const newTime = getTimeFromMouseEvent(e);
    const distToStart = Math.abs(newTime - startTime);
    const distToEnd = Math.abs(newTime - endTime);

    // Move the nearest handle
    if (distToStart < distToEnd) {
      onStartChange(newTime);
    } else {
      onEndChange(newTime);
    }
  };

  // Set up global mouse event listeners when dragging
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, onStartChange, onEndChange, videoDuration, fps]);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-label">Select Range</span>
        <span className="timeline-duration">
          {formatTime(startTime)} - {formatTime(endTime)}
          <span className="timeline-duration-total">
            {' '}({formatTime(endTime - startTime)} selected)
          </span>
        </span>
      </div>

      <div className="timeline-track-wrapper" ref={wrapperRef}>
        {/* Background track - width based on video duration */}
        <div
          ref={trackRef}
          className="timeline-track"
          style={{ width: `${trackWidth}px` }}
          onClick={handleTrackClick}
        >
          {/* Selected range highlight */}
          <div
            className="timeline-selected"
            style={{
              left: `${startPos}px`,
              width: `${selectedWidth}px`
            }}
          />

          {/* Start handle */}
          <div
            className={`timeline-handle timeline-handle-start ${dragging === 'start' ? 'dragging' : ''}`}
            style={{ left: `${startPos}px` }}
            data-time={startTime}
            onMouseDown={handleStartMouseDown}
          >
            <div className="timeline-handle-line" />
          </div>

          {/* End handle */}
          <div
            className={`timeline-handle timeline-handle-end ${dragging === 'end' ? 'dragging' : ''}`}
            style={{ left: `${endPos}px` }}
            data-time={endTime}
            onMouseDown={handleEndMouseDown}
          >
            <div className="timeline-handle-line" />
          </div>
        </div>

        {/* Scroll hint for long videos */}
        {trackWidth > 360 && (
          <div className="timeline-scroll-hint">
            ← Scroll to see more →
          </div>
        )}
      </div>
    </div>
  );
}
