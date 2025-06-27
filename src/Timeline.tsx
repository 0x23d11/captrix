import React, { useRef, useEffect, useState, useCallback } from "react";
import { FaPlay, FaPause, FaCut } from "react-icons/fa";
import "./Timeline.css";

type TimelineProps = {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onTimeChange: (time: number) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
};

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const TimelineComponent = ({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onTrimChange,
  onTimeChange,
  isPlaying = false,
  onPlayPause,
}: TimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<
    "playhead" | "start" | "end" | null
  >(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const dragStateRef = useRef<"playhead" | "start" | "end" | null>(null);
  const [localTrimStart, setLocalTrimStart] = useState(trimStart);
  const [localTrimEnd, setLocalTrimEnd] = useState(trimEnd);

  // Update local state when props change (but not during dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalTrimStart(trimStart);
      setLocalTrimEnd(trimEnd);
    }
  }, [trimStart, trimEnd, isDragging]);

  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!timelineRef.current) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const position = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(duration, position * duration));
    },
    [duration]
  );

  const getPositionFromTime = useCallback(
    (time: number): number => {
      if (!duration || duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "playhead" | "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();

      // Disable text selection during drag
      document.body.style.userSelect = "none";

      dragStateRef.current = type;
      setIsDragging(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!timelineRef.current) return;

      const time = getTimeFromPosition(e.clientX);

      // Use ref to get the current drag state to avoid stale closures
      const currentDragState = dragStateRef.current;

      if (currentDragState) {
        switch (currentDragState) {
          case "playhead": {
            const constrainedTime = Math.max(
              localTrimStart,
              Math.min(localTrimEnd, time)
            );
            onTimeChange(constrainedTime);
            break;
          }
          case "start": {
            const newStart = Math.max(0, Math.min(time, localTrimEnd - 0.5));
            setLocalTrimStart(newStart);
            break;
          }
          case "end": {
            const newEnd = Math.min(
              duration,
              Math.max(time, localTrimStart + 0.5)
            );
            setLocalTrimEnd(newEnd);
            break;
          }
        }
      } else {
        setHoverPosition(time);
      }
    },
    [getTimeFromPosition, onTimeChange, localTrimStart, localTrimEnd, duration]
  );

  const handleMouseUp = useCallback(() => {
    // Re-enable text selection
    document.body.style.userSelect = "";

    // Commit the local changes to the parent
    if (dragStateRef.current) {
      onTrimChange(localTrimStart, localTrimEnd);
    }

    dragStateRef.current = null;
    setIsDragging(null);
  }, [localTrimStart, localTrimEnd, onTrimChange]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't handle clicks if we're dragging or just finished dragging
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const time = getTimeFromPosition(e.clientX);
      onTimeChange(Math.max(localTrimStart, Math.min(localTrimEnd, time)));
    },
    [
      isDragging,
      getTimeFromPosition,
      onTimeChange,
      localTrimStart,
      localTrimEnd,
    ]
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1 : 0.1; // Fine control with shift
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onTimeChange(Math.max(localTrimStart, currentTime - step));
          break;
        case "ArrowRight":
          e.preventDefault();
          onTimeChange(Math.min(localTrimEnd, currentTime + step));
          break;
        case " ":
          e.preventDefault();
          onPlayPause?.();
          break;
        case "Home":
          e.preventDefault();
          onTimeChange(localTrimStart);
          break;
        case "End":
          e.preventDefault();
          onTimeChange(localTrimEnd);
          break;
        case "i":
          e.preventDefault();
          setLocalTrimStart(currentTime);
          onTrimChange(currentTime, localTrimEnd);
          break;
        case "o":
          e.preventDefault();
          setLocalTrimEnd(currentTime);
          onTrimChange(localTrimStart, currentTime);
          break;
      }
    },
    [
      currentTime,
      localTrimStart,
      localTrimEnd,
      onTimeChange,
      onTrimChange,
      onPlayPause,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const generateTimeMarkers = () => {
    const markers: React.ReactElement[] = [];

    // Don't generate markers if duration is invalid
    if (!duration || duration <= 0 || !isFinite(duration)) {
      return markers;
    }

    const interval = duration > 300 ? 60 : duration > 60 ? 10 : 5; // Dynamic interval based on duration

    for (let time = 0; time <= duration; time += interval) {
      const position = getPositionFromTime(time);
      markers.push(
        <div
          key={time}
          className="timeline-marker"
          style={{ left: `${position}%` }}
        >
          <div className="marker-line" />
          <div className="marker-time">{formatTime(time)}</div>
        </div>
      );
    }
    return markers;
  };

  // Show loading message if duration is not available
  if (!duration || duration <= 0) {
    return (
      <div className="timeline-container">
        <div className="flex items-center justify-center p-8 text-center">
          <div>
            <div className="text-lg font-semibold mb-2">
              Loading video timeline...
            </div>
            <div className="text-sm text-base-content/70">
              Duration: {duration === 0 ? "Not detected" : duration}
            </div>
            <div className="text-xs text-base-content/50 mt-2">
              If the timeline doesn't load, try using the "Estimate Duration"
              button below
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {/* Controls */}
      <div className="timeline-controls">
        <button
          className="btn btn-sm btn-ghost"
          onClick={onPlayPause}
          title="Space to play/pause"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>

        <div className="trim-display">
          <FaCut className="scissors-icon" />
          <span className="trim-time">
            {formatTime(localTrimEnd - localTrimStart)} selected
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="timeline-wrapper"
        onMouseLeave={() => setHoverPosition(null)}
      >
        <div
          ref={timelineRef}
          className="timeline-track"
          onClick={handleTimelineClick}
        >
          {/* Background track */}
          <div className="timeline-background" />

          {/* Time markers */}
          {generateTimeMarkers()}

          {/* Trimmed section */}
          <div
            className="timeline-selection"
            style={{
              left: `${getPositionFromTime(localTrimStart)}%`,
              width: `${
                getPositionFromTime(localTrimEnd) -
                getPositionFromTime(localTrimStart)
              }%`,
            }}
          />

          {/* Trim handles */}
          <div
            className={`timeline-handle timeline-handle-start ${
              isDragging === "start" ? "dragging" : ""
            }`}
            style={{ left: `${getPositionFromTime(localTrimStart)}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
            title="Drag to set start point (or press 'i')"
          >
            <div className="handle-line" />
            <div className="handle-grip" />
          </div>

          <div
            className={`timeline-handle timeline-handle-end ${
              isDragging === "end" ? "dragging" : ""
            }`}
            style={{ left: `${getPositionFromTime(localTrimEnd)}%` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
            title="Drag to set end point (or press 'o')"
          >
            <div className="handle-line" />
            <div className="handle-grip" />
          </div>

          {/* Playhead */}
          <div
            className={`timeline-playhead ${
              isDragging === "playhead" ? "dragging" : ""
            }`}
            style={{ left: `${getPositionFromTime(currentTime)}%` }}
            onMouseDown={(e) => handleMouseDown(e, "playhead")}
            title="Current time (arrow keys to move)"
          >
            <div className="playhead-line" />
            <div className="playhead-handle" />
          </div>

          {/* Hover indicator */}
          {hoverPosition !== null && !isDragging && (
            <div
              className="timeline-hover"
              style={{ left: `${getPositionFromTime(hoverPosition)}%` }}
            >
              <div className="hover-line" />
              <div className="hover-time">{formatTime(hoverPosition)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="timeline-shortcuts">
        <div className="shortcuts-text">
          <kbd>←→</kbd> Frame by frame • <kbd>Shift+←→</kbd> Second by second •
          <kbd>Space</kbd> Play/Pause • <kbd>I</kbd> Set In • <kbd>O</kbd> Set
          Out •<kbd>Home/End</kbd> Go to start/end
        </div>
      </div>
    </div>
  );
};

export default TimelineComponent;
