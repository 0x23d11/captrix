import React, { useState } from "react";
import { FaGripVertical, FaPlay, FaTrash, FaLayerGroup } from "react-icons/fa";

export type VideoSegment = {
  id: string;
  start: number;
  end: number;
  order: number;
};

type SegmentManagerProps = {
  segments: VideoSegment[];
  onSegmentsChange: (segments: VideoSegment[]) => void;
  duration: number;
  onPreviewSegment?: (segment: VideoSegment) => void;
  className?: string;
};

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const SegmentManager = ({
  segments,
  onSegmentsChange,
  duration,
  onPreviewSegment,
  className = "",
}: SegmentManagerProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sort segments by order for display
  const sortedSegments = [...segments].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newSegments = [...sortedSegments];
    const draggedSegment = newSegments[draggedIndex];

    // Remove dragged segment
    newSegments.splice(draggedIndex, 1);

    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newSegments.splice(insertIndex, 0, draggedSegment);

    // Update order numbers
    const updatedSegments = newSegments.map((segment, index) => ({
      ...segment,
      order: index,
    }));

    onSegmentsChange(updatedSegments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveSegment = (segmentId: string) => {
    const updatedSegments = segments
      .filter((seg) => seg.id !== segmentId)
      .map((segment, index) => ({ ...segment, order: index }));
    onSegmentsChange(updatedSegments);
  };

  const getTotalDuration = () => {
    return segments.reduce(
      (total, segment) => total + (segment.end - segment.start),
      0
    );
  };

  if (segments.length === 0) {
    return (
      <div className={`bg-base-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-base-content/70">
          <FaLayerGroup className="mx-auto mb-2 text-3xl" />
          <div className="text-lg font-semibold mb-1">
            No segments to manage
          </div>
          <div className="text-sm">
            Create some clips first to see segments here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-base-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Video Segments</h3>
          <p className="text-sm text-base-content/70">
            {segments.length} segment{segments.length !== 1 ? "s" : ""} • Total
            duration: {formatTime(getTotalDuration())}
          </p>
        </div>
        <div className="text-xs text-base-content/50">Drag to reorder</div>
      </div>

      <div className="space-y-2">
        {sortedSegments.map((segment, index) => (
          <div
            key={segment.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              flex items-center gap-3 p-3 bg-base-100 rounded-lg border transition-all duration-200
              ${
                draggedIndex === index
                  ? "opacity-50 transform scale-95"
                  : "opacity-100"
              }
              ${
                dragOverIndex === index && draggedIndex !== index
                  ? "border-primary border-2 bg-primary/5"
                  : "border-base-300"
              }
              hover:border-primary hover:shadow-md cursor-move
            `}
          >
            {/* Drag Handle */}
            <div className="text-base-content/40 hover:text-base-content/80 transition-colors">
              <FaGripVertical />
            </div>

            {/* Segment Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="badge badge-primary badge-sm">
                  {index + 1}
                </span>
                <span className="font-mono text-sm">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </span>
                <span className="text-xs text-base-content/60">
                  ({formatTime(segment.end - segment.start)})
                </span>
              </div>

              {/* Visual Timeline */}
              <div className="mt-2 relative h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${
                      ((segment.end - segment.start) / duration) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => onPreviewSegment?.(segment)}
                title="Preview segment"
              >
                <FaPlay />
              </button>
              <button
                className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
                onClick={() => handleRemoveSegment(segment.id)}
                title="Remove segment"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-base-100 rounded-lg border border-base-300">
        <div className="text-sm text-base-content/70">
          <div className="flex justify-between items-center">
            <span>Final video duration:</span>
            <span className="font-mono font-semibold">
              {formatTime(getTotalDuration())}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>Removed from original:</span>
            <span className="font-mono">
              {formatTime(duration - getTotalDuration())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentManager;
