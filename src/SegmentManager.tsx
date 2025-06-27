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
      <div className={`glass rounded-xl p-8 text-center ${className}`}>
        <div className="text-base-content/70">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLayerGroup className="text-2xl text-accent" />
          </div>
          <div className="text-lg font-semibold mb-2">
            No segments to manage
          </div>
          <div className="text-sm text-base-content/60">
            Create some clips first to see segments here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <FaLayerGroup className="text-accent text-sm" />
            </span>
            Video Segments
          </h3>
          <p className="text-sm text-base-content/70 mt-1">
            {segments.length} segment{segments.length !== 1 ? "s" : ""} • Total
            duration: {formatTime(getTotalDuration())}
          </p>
        </div>
        <div className="badge badge-ghost badge-sm">
          <span className="text-xs">Drag to reorder</span>
        </div>
      </div>

      <div className="space-y-3">
        {sortedSegments.map((segment, index) => (
          <div
            key={segment.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              flex items-center gap-4 p-4 glass rounded-xl border transition-all duration-300 cursor-move
              ${
                draggedIndex === index
                  ? "opacity-50 transform scale-95"
                  : "opacity-100"
              }
              ${
                dragOverIndex === index && draggedIndex !== index
                  ? "border-primary border-2 bg-primary/10 glow-primary"
                  : "border-base-300/50"
              }
              hover:border-primary/50 hover:shadow-lg hover:bg-base-200/30
            `}
          >
            {/* Drag Handle */}
            <div className="text-base-content/40 hover:text-base-content/80 transition-colors p-1">
              <FaGripVertical className="text-lg" />
            </div>

            {/* Segment Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-primary badge-sm font-medium">
                  #{index + 1}
                </span>
                <span className="font-mono text-sm font-medium">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </span>
                <span className="text-xs text-base-content/60 bg-base-300/30 px-2 py-1 rounded">
                  {formatTime(segment.end - segment.start)}
                </span>
              </div>

              {/* Visual Timeline */}
              <div className="relative h-3 bg-base-300/50 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-primary to-primary-focus rounded-full transition-all duration-300"
                  style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${
                      ((segment.end - segment.start) / duration) * 100
                    }%`,
                  }}
                />
                {/* Timeline markers */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 bg-white/80 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm btn-circle hover:bg-primary/20 hover:text-primary"
                onClick={() => onPreviewSegment?.(segment)}
                title="Preview segment"
              >
                <FaPlay className="text-xs" />
              </button>
              <button
                className="btn btn-ghost btn-sm btn-circle hover:bg-error/20 hover:text-error text-error/70"
                onClick={() => handleRemoveSegment(segment.id)}
                title="Remove segment"
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 glass rounded-xl p-4 border border-primary/20">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-primary/20 rounded-md flex items-center justify-center">
            <span className="text-primary text-xs">📊</span>
          </span>
          Export Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-base-content/70">Final video duration:</span>
            <span className="font-mono font-semibold text-primary">
              {formatTime(getTotalDuration())}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base-content/70">Removed from original:</span>
            <span className="font-mono text-error">
              {formatTime(duration - getTotalDuration())}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-base-content/50">Compression ratio:</span>
            <span className="font-mono">
              {((getTotalDuration() / duration) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentManager;
