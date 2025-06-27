import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import React, { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaBackward,
  FaForward,
  FaPause,
  FaPlay,
  FaSave,
  FaDownload,
  FaUndo,
  FaCut,
  FaTimes,
  FaLayerGroup,
} from "react-icons/fa";
import Timeline from "./Timeline";
import VideoPlayer, { VideoPlayerRef } from "./VideoPlayer";
import SegmentManager, { VideoSegment } from "./SegmentManager";

// Import types from Timeline
type ClipRange = {
  id: string;
  start: number;
  end: number;
};

type TimelineMode = "trim" | "clip";

type EditorProps = {
  videoUrl: string;
  onBack: () => void;
};

const Editor = ({ videoUrl, onBack }: EditorProps) => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<VideoPlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isDurationSet, setIsDurationSet] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clipping state
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("trim");
  const [clipRanges, setClipRanges] = useState<ClipRange[]>([]);

  // Segment management state
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [showSegmentManager, setShowSegmentManager] = useState(false);

  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        const ffmpegInstance = new FFmpeg();
        ffmpegInstance.on("log", ({ message }) => {
          console.log("FFmpeg log:", message);
        });
        ffmpegInstance.on("progress", ({ progress }) => {
          console.log("FFmpeg progress:", progress);
          setProgress(Math.round(progress * 100));
        });

        const baseURL = "/"; // from the public directory

        await ffmpegInstance.load({
          coreURL: await toBlobURL(
            `${baseURL}ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}ffmpeg-core.wasm`,
            "application/wasm"
          ),
          workerURL: await toBlobURL(
            `${baseURL}ffmpeg-core.worker.js`,
            "text/javascript"
          ),
        });

        setFfmpeg(ffmpegInstance);
      } catch (error) {
        console.error("Failed to load ffmpeg", error);
      }
    };

    loadFfmpeg();

    // Reset the duration flag when the video source changes
    setIsDurationSet(false);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCurrentTime(0);
    console.log("Video source changed, resetting all states");
  }, [editedVideoUrl, videoUrl]);

  // Handle duration change from VideoPlayer
  const handleDurationChange = (newDuration: number) => {
    console.log("Duration received from VideoPlayer:", newDuration);

    // Only update if duration actually changed or if it's the first time
    if (!isDurationSet || Math.abs(duration - newDuration) > 0.01) {
      setDuration(newDuration);

      // Reset trim values if this is the first time setting duration OR if we've reset to original video
      if (!isDurationSet || !editedVideoUrl) {
        setTrimStart(0);
        setTrimEnd(newDuration);
        console.log("Reset trim bounds to:", 0, newDuration);
      }

      setIsDurationSet(true);
    }
  };

  // Handle video ready
  const handleVideoReady = () => {
    console.log("Video is ready");
    // Duration should already be set by handleDurationChange
  };

  const handleTimeUpdate = (newCurrentTime: number) => {
    setCurrentTime(newCurrentTime);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Calculate video segments from clip ranges
  const calculateSegments = (clips: ClipRange[]): VideoSegment[] => {
    const segments: VideoSegment[] = [];
    let currentStart = 0;

    // Sort clip ranges by start time
    const sortedClips = [...clips].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];

      // Add segment before this clip (if it exists)
      if (currentStart < clip.start) {
        segments.push({
          id: `segment_${segments.length}`,
          start: currentStart,
          end: clip.start,
          order: segments.length,
        });
      }
      currentStart = clip.end;
    }

    // Add final segment after last clip
    if (currentStart < duration) {
      segments.push({
        id: `segment_${segments.length}`,
        start: currentStart,
        end: duration,
        order: segments.length,
      });
    }

    return segments;
  };

  // Update segments when clip ranges change
  useEffect(() => {
    if (clipRanges.length > 0) {
      const newSegments = calculateSegments(clipRanges);
      setVideoSegments(newSegments);
      setShowSegmentManager(true);
    } else {
      setVideoSegments([]);
      setShowSegmentManager(false);
    }
  }, [clipRanges, duration]);

  const handleTrim = async () => {
    if (!ffmpeg) {
      console.error("FFmpeg not loaded yet");
      return;
    }

    if (trimEnd <= trimStart) {
      console.error("End time must be after start time");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      console.log("Starting trim process...");
      const timestamp = Date.now();
      const inputFileName = `input_${timestamp}.webm`;
      const outputFileName = `output_${timestamp}.webm`;
      console.log("Using filenames:", { inputFileName, outputFileName });

      // Clean up any existing files first to ensure fresh processing
      try {
        const files = await ffmpeg.listDir("/");
        console.log("FFmpeg files before trim:", files);

        for (const file of files) {
          if (
            (file.name.startsWith("input") && file.name.endsWith(".webm")) ||
            (file.name.startsWith("output") && file.name.endsWith(".webm"))
          ) {
            await ffmpeg.deleteFile(file.name);
            console.log("Cleaned up existing file:", file.name);
          }
        }
      } catch (e) {
        // Files don't exist or listDir failed, which is fine
        console.log("Cleanup failed or no files to clean:", e);
      }

      console.log("Fetching video data...");
      console.log("Source URLs:", {
        videoUrl: videoUrl.substring(0, 50) + "...",
        editedVideoUrl: editedVideoUrl
          ? editedVideoUrl.substring(0, 50) + "..."
          : null,
        usingUrl: videoUrl.substring(0, 50) + "...",
      });

      // Always fetch from the original video, not any previously trimmed version
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`Video data fetched: ${arrayBuffer.byteLength} bytes`);

      console.log("Writing input file to FFmpeg...");
      await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

      console.log(
        `Trimming video from ${trimStart}s to ${trimEnd}s (duration: ${
          trimEnd - trimStart
        }s)`
      );

      // Use stream copy for WebM - much faster since no re-encoding needed
      const ffmpegArgs = [
        "-i",
        inputFileName,
        "-ss",
        trimStart.toString(),
        "-t",
        (trimEnd - trimStart).toString(),
        "-c",
        "copy", // Copy streams without re-encoding for maximum speed
        "-avoid_negative_ts",
        "make_zero",
        outputFileName,
      ];

      console.log("FFmpeg command:", ffmpegArgs.join(" "));

      // Execute trimming with shorter timeout since stream copy is much faster
      const trimPromise = ffmpeg.exec(ffmpegArgs);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("FFmpeg operation timed out")),
          30000
        ); // 30 second timeout should be plenty for stream copy
      });

      await Promise.race([trimPromise, timeoutPromise]);
      console.log("FFmpeg processing completed");

      // Read and validate output file
      console.log("Reading output file...");
      const data = await ffmpeg.readFile(outputFileName);
      console.log(`Output file size: ${data.length} bytes`);

      if (data.length === 0) {
        throw new Error("Output file is empty - FFmpeg may have failed");
      }

      if (data.length < 1000) {
        throw new Error("Output file is too small - likely corrupted");
      }

      // Create blob with proper MIME type
      const newBlob = new Blob([data], {
        type: "video/webm",
      });

      // Validate blob
      if (newBlob.size !== data.length) {
        throw new Error("Blob creation failed - size mismatch");
      }

      const newUrl = URL.createObjectURL(newBlob);
      setEditedVideoUrl(newUrl);

      // Clean up FFmpeg files
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        console.log("Cleaned up temporary files");
      } catch (cleanupError) {
        console.warn("Failed to clean up temporary files:", cleanupError);
      }

      // Reset trim bounds to the new video
      const newDuration = trimEnd - trimStart;
      console.log("Setting new video duration after trim:", newDuration);

      // Reset duration detection flag so the new video gets properly processed
      setIsDurationSet(false);

      // Set initial trim bounds for the new trimmed video
      setTrimStart(0);
      setTrimEnd(newDuration);
      setDuration(newDuration);
      setCurrentTime(0);

      console.log("Trim operation completed successfully");
    } catch (error) {
      console.error("Error during trimming:", error);
      alert(`Trimming failed: ${error.message || error}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleClip = async () => {
    if (!ffmpeg) {
      console.error("FFmpeg not loaded yet");
      return;
    }

    if (clipRanges.length === 0) {
      console.error("No clips to remove");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      console.log("Starting clip process...");
      console.log("Clip ranges to remove:", clipRanges);

      // Use the ordered segments from segment manager
      const segments = videoSegments
        .sort((a, b) => a.order - b.order)
        .map((segment) => ({ start: segment.start, end: segment.end }));

      console.log("Video segments after clipping (ordered):", segments);

      if (segments.length === 0) {
        throw new Error("All video would be clipped - no segments remaining");
      }

      // Process segments with FFmpeg
      const timestamp = Date.now();
      const inputFileName = `input_${timestamp}.webm`;
      const outputFileName = `output_${timestamp}.webm`;

      // Clean up existing files
      try {
        const files = await ffmpeg.listDir("/");
        for (const file of files) {
          if (
            (file.name.startsWith("input") && file.name.endsWith(".webm")) ||
            (file.name.startsWith("output") && file.name.endsWith(".webm")) ||
            (file.name.startsWith("segment") && file.name.endsWith(".webm"))
          ) {
            await ffmpeg.deleteFile(file.name);
            console.log("Cleaned up existing file:", file.name);
          }
        }
      } catch (e) {
        console.log("Cleanup failed or no files to clean:", e);
      }

      // Fetch and write input file
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

      // Create individual segment files
      const segmentFiles: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentFileName = `segment_${i}_${timestamp}.webm`;
        segmentFiles.push(segmentFileName);

        const ffmpegArgs = [
          "-i",
          inputFileName,
          "-ss",
          segment.start.toString(),
          "-t",
          (segment.end - segment.start).toString(),
          "-c",
          "copy",
          "-avoid_negative_ts",
          "make_zero",
          segmentFileName,
        ];

        console.log(
          `Creating segment ${i + 1}/${segments.length}:`,
          ffmpegArgs.join(" ")
        );
        await ffmpeg.exec(ffmpegArgs);
      }

      // Create concat file
      const concatContent = segmentFiles
        .map((file) => `file '${file}'`)
        .join("\n");
      await ffmpeg.writeFile(
        "concat.txt",
        new TextEncoder().encode(concatContent)
      );

      // Concatenate all segments
      const concatArgs = [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-c",
        "copy",
        outputFileName,
      ];

      console.log("Concatenating segments:", concatArgs.join(" "));
      await ffmpeg.exec(concatArgs);

      // Read and validate output
      const data = await ffmpeg.readFile(outputFileName);
      if (data.length === 0) {
        throw new Error("Output file is empty");
      }

      // Create blob and URL
      const newBlob = new Blob([data], { type: "video/webm" });
      const newUrl = URL.createObjectURL(newBlob);
      setEditedVideoUrl(newUrl);

      // Clean up temporary files
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        await ffmpeg.deleteFile("concat.txt");
        for (const segmentFile of segmentFiles) {
          await ffmpeg.deleteFile(segmentFile);
        }
      } catch (cleanupError) {
        console.warn("Failed to clean up temporary files:", cleanupError);
      }

      // Calculate new duration
      const totalClippedDuration = clipRanges.reduce(
        (sum, clip) => sum + (clip.end - clip.start),
        0
      );
      const newDuration = duration - totalClippedDuration;

      // Reset states for new video
      setIsDurationSet(false);
      setTrimStart(0);
      setTrimEnd(newDuration);
      setDuration(newDuration);
      setCurrentTime(0);
      setClipRanges([]); // Clear clips after applying
      setVideoSegments([]); // Clear segments after applying
      setShowSegmentManager(false);

      console.log("Clip operation completed successfully");
    } catch (error) {
      console.error("Error during clipping:", error);
      alert(`Clipping failed: ${error.message || error}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handlePreviewSegment = (segment: VideoSegment) => {
    if (videoRef.current) {
      videoRef.current.setCurrentTime(segment.start);
      setCurrentTime(segment.start);
      // Optionally play the segment
      videoRef.current.play();
      setIsPlaying(true);

      // Stop playback at segment end using the video element directly
      const videoElement = videoRef.current.getVideoElement();
      if (videoElement) {
        const stopPlayback = () => {
          if (videoElement.currentTime >= segment.end) {
            videoElement.pause();
            setIsPlaying(false);
            videoElement.removeEventListener("timeupdate", stopPlayback);
          }
        };

        videoElement.addEventListener("timeupdate", stopPlayback);
      }
    }
  };

  const handleDownload = () => {
    if (editedVideoUrl) {
      const a = document.createElement("a");
      a.href = editedVideoUrl;
      a.download = `${
        timelineMode === "trim" ? "trimmed" : "clipped"
      }-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleReset = async () => {
    console.log("Resetting to original video...");

    // Clean up the edited video URL
    if (editedVideoUrl) {
      URL.revokeObjectURL(editedVideoUrl);
      setEditedVideoUrl(null);
    }

    // Clean up FFmpeg files if they exist
    if (ffmpeg) {
      try {
        // List all files and delete any input/output files
        const files = await ffmpeg.listDir("/");
        console.log("FFmpeg files before cleanup:", files);

        for (const file of files) {
          if (
            (file.name.startsWith("input_") && file.name.endsWith(".webm")) ||
            (file.name.startsWith("output_") && file.name.endsWith(".webm"))
          ) {
            await ffmpeg.deleteFile(file.name);
            console.log("Deleted file:", file.name);
          }
        }
        console.log("Cleaned up FFmpeg temporary files");
      } catch (e) {
        // Files don't exist, which is fine
        console.log("No temporary files to clean up or cleanup failed:", e);
      }
    }

    // Reset to original video - the VideoPlayer will handle the reload automatically
    setCurrentTime(0);

    // Reset the duration detection flag and trim bounds
    setIsDurationSet(false);

    // Reset clipping state
    setClipRanges([]);
    setVideoSegments([]);
    setShowSegmentManager(false);
    setTimelineMode("trim");

    // Get the current original duration and reset trim bounds
    if (videoRef.current) {
      const originalDuration = videoRef.current.getDuration();
      if (originalDuration && originalDuration > 0) {
        setTrimStart(0);
        setTrimEnd(originalDuration);
        console.log("Reset trim bounds to original:", 0, originalDuration);
      }
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) {
      return "00:00";
    }
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col h-screen bg-base-100 text-base-content">
      <div className="navbar bg-base-300">
        <div className="flex-1">
          <button className="btn btn-ghost text-xl" onClick={onBack}>
            <FaArrowLeft className="mr-2" />
            Back to Recorder
          </button>
        </div>
        <div className="flex-none flex gap-2">
          {/* Mode Toggle */}
          <div className="btn-group">
            <button
              className={`btn btn-sm ${
                timelineMode === "trim" ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setTimelineMode("trim")}
              disabled={isProcessing}
            >
              <FaCut className="mr-1" />
              Trim
            </button>
            <button
              className={`btn btn-sm ${
                timelineMode === "clip" ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setTimelineMode("clip")}
              disabled={isProcessing}
            >
              <FaTimes className="mr-1" />
              Clip
            </button>
          </div>

          {/* Segment Manager Toggle - only show when in clip mode and have segments */}
          {timelineMode === "clip" && videoSegments.length > 0 && (
            <button
              className={`btn btn-sm ${
                showSegmentManager ? "btn-active" : "btn-ghost"
              }`}
              onClick={() => setShowSegmentManager(!showSegmentManager)}
              disabled={isProcessing}
            >
              <FaLayerGroup className="mr-1" />
              {showSegmentManager ? "Hide" : "Show"} Segments
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={timelineMode === "trim" ? handleTrim : handleClip}
            disabled={
              isProcessing ||
              !ffmpeg ||
              (timelineMode === "trim"
                ? trimEnd <= trimStart
                : clipRanges.length === 0)
            }
          >
            <FaSave className="mr-2" />
            {isProcessing
              ? "Processing..."
              : timelineMode === "trim"
              ? "Trim"
              : "Apply Clips"}
          </button>
          {editedVideoUrl && (
            <>
              <button
                className="btn btn-success"
                onClick={handleDownload}
                disabled={isProcessing}
              >
                <FaDownload className="mr-2" />
                Download
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleReset}
                disabled={isProcessing}
              >
                <FaUndo className="mr-2" />
                Reset
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <VideoPlayer
            ref={videoRef}
            src={editedVideoUrl ?? videoUrl}
            className="w-full rounded-lg shadow-2xl"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onReady={handleVideoReady}
            muted={false}
            controls={false}
          />
          <div className="p-4 bg-base-200 rounded-b-lg">
            <div className="flex justify-center items-center gap-4">
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => {
                  if (videoRef.current) {
                    const currentTime = videoRef.current.getCurrentTime();
                    videoRef.current.setCurrentTime(
                      Math.max(0, currentTime - 5)
                    );
                  }
                }}
              >
                <FaBackward size="1.5em" />
              </button>
              <button
                className="btn btn-primary btn-circle btn-lg"
                onClick={handlePlayPause}
              >
                {isPlaying ? <FaPause size="1.5em" /> : <FaPlay size="1.5em" />}
              </button>
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => {
                  if (videoRef.current) {
                    const currentTime = videoRef.current.getCurrentTime();
                    videoRef.current.setCurrentTime(currentTime + 5);
                  }
                }}
              >
                <FaForward size="1.5em" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 w-full max-w-4xl">
          {/* Debug info */}
          <div className="mb-2 text-sm text-gray-500">
            Duration: {duration > 0 ? `${duration.toFixed(1)}s` : "Loading..."}{" "}
            | Current: {currentTime.toFixed(1)}s
            {timelineMode === "trim" ? (
              <>
                {" "}
                | Selection: {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s
              </>
            ) : (
              <>
                {" "}
                | Clips: {clipRanges.length} ranges to remove
                {showSegmentManager && ` | Segments: ${videoSegments.length}`}
              </>
            )}
          </div>

          <Timeline
            duration={duration}
            currentTime={currentTime}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTrimChange={(start, end) => {
              console.log("Trim change:", start, end);
              setTrimStart(start);
              setTrimEnd(end);
            }}
            onTimeChange={(time) => {
              console.log("Time change:", time);
              if (videoRef.current) {
                videoRef.current.setCurrentTime(time);
                setCurrentTime(time);
              }
            }}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            mode={timelineMode}
            clipRanges={clipRanges}
            onClipRangesChange={(ranges) => {
              console.log("Clip ranges changed:", ranges);
              setClipRanges(ranges);
            }}
          />

          {/* Segment Manager - only show in clip mode when there are segments */}
          {showSegmentManager && timelineMode === "clip" && (
            <div className="mt-4">
              <SegmentManager
                segments={videoSegments}
                onSegmentsChange={setVideoSegments}
                duration={duration}
                onPreviewSegment={handlePreviewSegment}
              />
            </div>
          )}

          {/* Manual controls for testing */}
          <div className="mt-2 flex gap-2">
            <button
              className="btn btn-xs"
              onClick={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.getDuration();
                  console.log("Manual duration check:", dur);
                  if (dur && isFinite(dur) && dur !== Infinity) {
                    setDuration(dur);
                    setTrimStart(0);
                    setTrimEnd(dur);
                    setIsDurationSet(true);
                  }
                }
              }}
            >
              Force Set Duration
            </button>
            <button
              className="btn btn-xs"
              onClick={async () => {
                if (videoRef.current) {
                  console.log("Trying to refresh video player...");

                  // The VideoPlayer should handle duration detection automatically
                  // Let's just trigger a manual check
                  setTimeout(() => {
                    const dur = videoRef.current?.getDuration();
                    if (dur && dur > 0) {
                      console.log("Refreshed duration:", dur);
                      setDuration(dur);
                      setTrimStart(0);
                      setTrimEnd(dur);
                      setIsDurationSet(true);
                    }
                  }, 500);
                }
              }}
            >
              Refresh Player
            </button>
            <button
              className="btn btn-xs"
              onClick={() => {
                // Reset everything to start fresh
                setIsDurationSet(false);
                setDuration(0);
                setTrimStart(0);
                setTrimEnd(0);
                setCurrentTime(0);
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
      {(isProcessing || (progress > 0 && progress < 100)) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Processing Video...</h2>
              <p className="text-sm text-base-content/70 mb-4">
                {timelineMode === "trim" ? (
                  <>
                    Trimming from {formatTime(trimStart)} to{" "}
                    {formatTime(trimEnd)}
                    <br />
                    Duration: {formatTime(trimEnd - trimStart)}
                  </>
                ) : (
                  <>
                    Removing {clipRanges.length} clip
                    {clipRanges.length !== 1 ? "s" : ""}
                    <br />
                    Total removed:{" "}
                    {formatTime(
                      clipRanges.reduce(
                        (sum, clip) => sum + (clip.end - clip.start),
                        0
                      )
                    )}
                  </>
                )}
              </p>
              <progress
                className="progress progress-primary w-full"
                value={progress}
                max="100"
              ></progress>
              <div className="text-center text-sm text-base-content/70 mt-2">
                {progress > 0 ? `${progress}%` : "Preparing..."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
