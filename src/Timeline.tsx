import React, { useRef, useEffect, useState, useCallback } from "react";
import { FaPlay, FaPause, FaCut, FaTimes } from "react-icons/fa";
import "./Timeline.css";

// New types for clipping functionality
type ClipRange = {
  id: string;
  start: number;
  end: number;
};

type TimelineMode = "trim" | "clip";

type TimelineProps = {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onTimeChange: (time: number) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  // New clipping props
  mode?: TimelineMode;
  clipRanges?: ClipRange[];
  onClipRangesChange?: (ranges: ClipRange[]) => void;
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
  mode = "trim",
  clipRanges = [],
  onClipRangesChange,
}: TimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<
    "playhead" | "start" | "end" | "clip-start" | "clip-end" | null
  >(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const dragStateRef = useRef<
    "playhead" | "start" | "end" | "clip-start" | "clip-end" | null
  >(null);

  // Track which clip is being dragged
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [localTrimStart, setLocalTrimStart] = useState(trimStart);
  const [localTrimEnd, setLocalTrimEnd] = useState(trimEnd);

  // Clipping state
  const [isSelectingClip, setIsSelectingClip] = useState(false);
  const [clipSelectionStart, setClipSelectionStart] = useState<number | null>(
    null
  );

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
    (
      e: React.MouseEvent,
      type: "playhead" | "start" | "end" | "clip-start" | "clip-end",
      clipId?: string
    ) => {
      console.log("Mouse down:", type, clipId);
      e.preventDefault();
      e.stopPropagation();

      // Disable text selection during drag
      document.body.style.userSelect = "none";

      dragStateRef.current = type;
      setIsDragging(type);

      if (clipId) {
        setDraggedClipId(clipId);
        console.log("Set dragged clip ID:", clipId);
      }
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
          case "clip-start": {
            if (draggedClipId) {
              const clip = clipRanges.find((c) => c.id === draggedClipId);
              if (clip) {
                const newStart = Math.max(0, Math.min(time, clip.end - 0.1));
                console.log(
                  "Dragging clip start:",
                  draggedClipId,
                  "from",
                  clip.start,
                  "to",
                  newStart
                );
                const updatedRanges = clipRanges.map((c) =>
                  c.id === draggedClipId ? { ...c, start: newStart } : c
                );
                onClipRangesChange?.(updatedRanges);
                // Update video position for preview
                onTimeChange(newStart);
              }
            } else {
              console.log("No dragged clip ID for clip-start");
            }
            break;
          }
          case "clip-end": {
            if (draggedClipId) {
              const clip = clipRanges.find((c) => c.id === draggedClipId);
              if (clip) {
                const newEnd = Math.min(
                  duration,
                  Math.max(time, clip.start + 0.1)
                );
                console.log(
                  "Dragging clip end:",
                  draggedClipId,
                  "from",
                  clip.end,
                  "to",
                  newEnd
                );
                const updatedRanges = clipRanges.map((c) =>
                  c.id === draggedClipId ? { ...c, end: newEnd } : c
                );
                onClipRangesChange?.(updatedRanges);
                // Update video position for preview
                onTimeChange(newEnd);
              }
            } else {
              console.log("No dragged clip ID for clip-end");
            }
            break;
          }
        }
      } else {
        // Only set hover position if we're not over a clip handle
        const isOverClipHandle =
          mode === "clip" &&
          clipRanges.some((clip) => {
            const startPos = getPositionFromTime(clip.start);
            const endPos = getPositionFromTime(clip.end);
            const currentPos = getPositionFromTime(time);
            // Check if we're within handle range (±2% for better UX)
            return (
              Math.abs(currentPos - startPos) < 2 ||
              Math.abs(currentPos - endPos) < 2
            );
          });

        if (!isOverClipHandle) {
          setHoverPosition(time);

          // During clip selection, seek to hover position for preview
          if (
            mode === "clip" &&
            isSelectingClip &&
            clipSelectionStart !== null
          ) {
            onTimeChange(time);
          }
        }
      }
    },
    [
      getTimeFromPosition,
      onTimeChange,
      localTrimStart,
      localTrimEnd,
      duration,
      clipRanges,
      onClipRangesChange,
      draggedClipId,
      mode,
      isSelectingClip,
      clipSelectionStart,
    ]
  );

  const handleMouseUp = useCallback(() => {
    // Re-enable text selection
    document.body.style.userSelect = "";

    // Commit the local changes to the parent
    if (dragStateRef.current === "start" || dragStateRef.current === "end") {
      onTrimChange(localTrimStart, localTrimEnd);
    }

    dragStateRef.current = null;
    setIsDragging(null);
    setDraggedClipId(null);
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

      if (mode === "clip" && isSelectingClip) {
        // Complete clip selection
        if (clipSelectionStart !== null) {
          const start = Math.min(clipSelectionStart, time);
          const end = Math.max(clipSelectionStart, time);

          if (end - start > 0.1) {
            // Minimum clip duration
            const newClip: ClipRange = {
              id: `clip_${Date.now()}`,
              start,
              end,
            };

            const updatedRanges = [...clipRanges, newClip].sort(
              (a, b) => a.start - b.start
            );
            onClipRangesChange?.(updatedRanges);
          }

          setIsSelectingClip(false);
          setClipSelectionStart(null);
        }
      } else if (mode === "clip" && !isSelectingClip) {
        // Start clip selection
        setIsSelectingClip(true);
        setClipSelectionStart(time);
        // Seek to start position for preview
        onTimeChange(time);
      } else {
        // Normal time change for trim mode
        onTimeChange(Math.max(localTrimStart, Math.min(localTrimEnd, time)));
      }
    },
    [
      isDragging,
      getTimeFromPosition,
      onTimeChange,
      localTrimStart,
      localTrimEnd,
      mode,
      isSelectingClip,
      clipSelectionStart,
      clipRanges,
      onClipRangesChange,
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
        case "Escape":
          e.preventDefault();
          // Cancel clip selection if in progress
          if (mode === "clip" && isSelectingClip) {
            setIsSelectingClip(false);
            setClipSelectionStart(null);
          }
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
          {mode === "trim" ? (
            <>
              <FaCut className="scissors-icon" />
              <span className="trim-time">
                {formatTime(localTrimEnd - localTrimStart)} selected
              </span>
            </>
          ) : (
            <>
              <FaTimes className="scissors-icon" />
              <span className="trim-time">
                {clipRanges.length} clips to remove
                {isSelectingClip &&
                clipSelectionStart !== null &&
                hoverPosition !== null
                  ? ` | Selecting: ${formatTime(
                      Math.abs(hoverPosition - clipSelectionStart)
                    )}`
                  : isSelectingClip
                  ? " (selecting...)"
                  : " (click to add)"}
              </span>
            </>
          )}
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

          {/* Trimmed section - only show in trim mode */}
          {mode === "trim" && (
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
          )}

          {/* Clip ranges - only show in clip mode */}
          {mode === "clip" &&
            clipRanges.map((clip) => (
              <div key={clip.id}>
                {/* Clip range background */}
                <div
                  className="timeline-clip-range"
                  style={{
                    left: `${getPositionFromTime(clip.start)}%`,
                    width: `${
                      getPositionFromTime(clip.end) -
                      getPositionFromTime(clip.start)
                    }%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Remove clip on click (only if not dragging)
                    if (!isDragging) {
                      const updatedRanges = clipRanges.filter(
                        (r) => r.id !== clip.id
                      );
                      onClipRangesChange?.(updatedRanges);
                    }
                  }}
                  title={`Click to remove clip (${formatTime(
                    clip.start
                  )} - ${formatTime(clip.end)})`}
                />

                {/* Clip start handle */}
                <div
                  className={`timeline-handle timeline-clip-handle timeline-clip-handle-start ${
                    isDragging === "clip-start" && draggedClipId === clip.id
                      ? "dragging"
                      : ""
                  }`}
                  style={{ left: `${getPositionFromTime(clip.start)}%` }}
                  onMouseDown={(e) => handleMouseDown(e, "clip-start", clip.id)}
                  onClick={(e) => e.stopPropagation()}
                  title={`Drag to adjust clip start: ${formatTime(clip.start)}`}
                >
                  <div className="handle-line" />
                  <div className="handle-grip handle-grip-clip" />
                </div>

                {/* Clip end handle */}
                <div
                  className={`timeline-handle timeline-clip-handle timeline-clip-handle-end ${
                    isDragging === "clip-end" && draggedClipId === clip.id
                      ? "dragging"
                      : ""
                  }`}
                  style={{ left: `${getPositionFromTime(clip.end)}%` }}
                  onMouseDown={(e) => handleMouseDown(e, "clip-end", clip.id)}
                  onClick={(e) => e.stopPropagation()}
                  title={`Drag to adjust clip end: ${formatTime(clip.end)}`}
                >
                  <div className="handle-line" />
                  <div className="handle-grip handle-grip-clip" />
                </div>
              </div>
            ))}

          {/* Active clip selection */}
          {mode === "clip" &&
            isSelectingClip &&
            clipSelectionStart !== null &&
            hoverPosition !== null && (
              <div
                className="timeline-clip-selection"
                style={{
                  left: `${getPositionFromTime(
                    Math.min(clipSelectionStart, hoverPosition)
                  )}%`,
                  width: `${Math.abs(
                    getPositionFromTime(hoverPosition) -
                      getPositionFromTime(clipSelectionStart)
                  )}%`,
                }}
              />
            )}

          {/* Trim handles - only show in trim mode */}
          {mode === "trim" && (
            <>
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
            </>
          )}

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
          <kbd>Space</kbd> Play/Pause
          {mode === "trim" ? (
            <>
              • <kbd>I</kbd> Set In • <kbd>O</kbd> Set Out • <kbd>Home/End</kbd>{" "}
              Go to start/end
            </>
          ) : (
            <>
              • <kbd>Click & drag</kbd> Select clip range • <kbd>Esc</kbd>{" "}
              Cancel selection
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineComponent;
