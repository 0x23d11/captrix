import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Editor from "./Editor";
import {
  FaDesktop,
  FaWindowMaximize,
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaStop,
  FaSave,
  FaRedo,
  FaEdit,
  FaCog,
} from "react-icons/fa";

type Source = {
  id: string;
  name: string;
  thumbnailURL: string;
};

const App = () => {
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [filteredSources, setFilteredSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceType, setSourceType] = useState<"screen" | "window" | null>(
    null
  );

  useEffect(() => {
    window.electronAPI.getSources().then(setAllSources);
  }, []);

  useEffect(() => {
    if (sourceType) {
      const filtered = allSources.filter((source) =>
        source.id.startsWith(sourceType)
      );
      setFilteredSources(filtered);
    } else {
      setFilteredSources([]);
    }
  }, [sourceType, allSources]);

  const selectSource = (source: Source) => {
    setSelectedSource(source);
  };

  if (selectedSource) {
    return (
      <Recorder
        source={selectedSource}
        clearSource={() => setSelectedSource(null)}
      />
    );
  }

  if (!sourceType) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-base-200">
        <h1 className="text-4xl font-bold mb-8">What do you want to record?</h1>
        <div className="flex gap-4">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setSourceType("screen")}
          >
            <FaDesktop className="mr-2" />
            Record Entire Screen
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => setSourceType("window")}
          >
            <FaWindowMaximize className="mr-2" />
            Record an App Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-base-200 min-h-screen">
      <div className="flex items-center mb-8">
        <button className="btn btn-ghost" onClick={() => setSourceType(null)}>
          <FaArrowLeft className="mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold ml-4">
          Select a {sourceType === "screen" ? "Screen" : "Window"}
        </h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSources.length > 0 ? (
          filteredSources.map((source) => (
            <div
              key={source.id}
              className="card bg-base-100 shadow-xl image-full cursor-pointer transition-transform hover:scale-105"
              onClick={() => selectSource(source)}
            >
              <figure>
                <img
                  src={source.thumbnailURL}
                  alt={source.name}
                  className="w-full"
                />
              </figure>
              <div className="card-body justify-end p-4">
                <h2 className="card-title text-white text-sm">{source.name}</h2>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center p-8 bg-base-100 rounded-lg">
            <h3 className="text-xl font-bold">
              No {sourceType === "screen" ? "screens" : "windows"} found.
            </h3>
            <p className="mt-2 text-base-content/70">
              Please ensure you have granted screen recording permissions in
              your System Settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Recorder = ({
  source,
  clearSource,
}: {
  source: Source;
  clearSource: () => void;
}) => {
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "paused" | "recorded"
  >("idle");
  const [showEditor, setShowEditor] = useState(false);
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const recordedChunks = React.useRef<Blob[]>([]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const videoStreamRef = React.useRef<MediaStream | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const webcamPreviewRef = React.useRef<HTMLVideoElement>(null);
  const webcamStreamRef = React.useRef<MediaStream | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = React.useRef<number | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioSources, setAudioSources] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioSourceId, setSelectedAudioSourceId] = useState<
    string | null
  >(null);
  const [webcamSources, setWebcamSources] = useState<MediaDeviceInfo[]>([]);
  const [selectedWebcamId, setSelectedWebcamId] = useState<string | null>(null);
  const [autoZoomPan, setAutoZoomPan] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    zoomFactor: 2,
    animationDuration: 600,
    smoothing: 0.05,
    inactivityTimeout: 2000,
  });
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const cursorPositionRef = React.useRef({ x: 0, y: 0 });
  const [displays, setDisplays] = useState<Display[]>([]);
  const sourceRectRef = React.useRef({ sx: 0, sy: 0, sWidth: 0, sHeight: 0 });
  const animationStateRef = React.useRef({
    isAnimating: false,
    startTime: 0,
    duration: 600, // ms, increased for a smoother feel
    startRect: { sx: 0, sy: 0, sWidth: 0, sHeight: 0 },
    endRect: { sx: 0, sy: 0, sWidth: 0, sHeight: 0 },
  });

  const inactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isZoomedInRef = React.useRef(isZoomedIn);
  isZoomedInRef.current = isZoomedIn;

  const getVideoStream = async () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-expect-error - chromeMediaSourceId is a valid constraint
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
          },
        },
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.controls = false;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  useEffect(() => {
    const getMediaSources = async () => {
      try {
        // Request dummy stream to get permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setAudioSources(audioInputDevices);
        if (audioInputDevices.length > 0) {
          setSelectedAudioSourceId(audioInputDevices[0].deviceId);
        }

        const videoInputDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setWebcamSources(videoInputDevices);

        // Stop dummy stream
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Could not get media devices or permissions.", error);
        setAudioSources([]);
        setWebcamSources([]);
      }
    };

    getMediaSources();
    window.electronAPI.getDisplays().then(setDisplays);
  }, []);

  useEffect(() => {
    if (
      !autoZoomPan ||
      (recordingState !== "recording" && recordingState !== "paused")
    ) {
      return;
    }

    const handleMouseAction = (position: { x: number; y: number }) => {
      if (source.id.startsWith("screen")) {
        const displayId = parseInt(source.id.split(":")[1], 10);
        const display = displays.find((d) => d.id === displayId);
        if (display) {
          const { x, y, width, height } = display.bounds;
          if (
            position.x < x ||
            position.x > x + width ||
            position.y < y ||
            position.y > y + height
          ) {
            return;
          }
        }
      }
      cursorPositionRef.current = position;

      if (!isZoomedInRef.current) {
        setIsZoomedIn(true);
      }

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setIsZoomedIn(false);
      }, settings.inactivityTimeout); // 2 seconds of inactivity
    };

    const handleClick = (position: { x: number; y: number }) => {
      // Don't re-trigger zoom if already zoomed in.
      if (isZoomedInRef.current) {
        handleMouseAction(position);
        return;
      }
      handleMouseAction(position);
    };

    const handleMouseMove = (position: { x: number; y: number }) => {
      cursorPositionRef.current = position;
      if (isZoomedInRef.current) {
        handleMouseAction(position);
      }
    };

    const handleKeyboardActivity = () => {
      // On keyboard activity, zoom to the cursor's last known position.
      handleMouseAction(cursorPositionRef.current);
    };

    window.electronAPI.startMouseEventTracking();
    const unsubscribeClick = window.electronAPI.onMouseClick(handleClick);
    const unsubscribeMove = window.electronAPI.onMouseMove(handleMouseMove);
    const unsubscribeKeyboard = window.electronAPI.onKeyboardActivity(
      handleKeyboardActivity
    );

    return () => {
      window.electronAPI.stopMouseEventTracking();
      unsubscribeClick();
      unsubscribeMove();
      unsubscribeKeyboard();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [autoZoomPan, recordingState, displays, source.id]);

  useEffect(() => {
    if (videoStreamRef.current && source) {
      const video = videoStreamRef.current.getVideoTracks()[0];
      const { width, height } = video.getSettings();

      animationStateRef.current.isAnimating = true;
      animationStateRef.current.startTime = performance.now();
      animationStateRef.current.startRect = { ...sourceRectRef.current };
      animationStateRef.current.duration = settings.animationDuration;

      if (isZoomedIn) {
        // We are zooming IN
        const zoomFactor = settings.zoomFactor;
        const targetWidth = width / zoomFactor;
        const targetHeight = height / zoomFactor;

        let targetSx = 0;
        let targetSy = 0;

        if (source.id.startsWith("screen")) {
          const displayId = parseInt(source.id.split(":")[1], 10);
          const display = displays.find((d) => d.id === displayId);
          if (display) {
            const scaleX = width / display.bounds.width;
            const scaleY = height / display.bounds.height;
            const scaledCursorX =
              (cursorPositionRef.current.x - display.bounds.x) * scaleX;
            const scaledCursorY =
              (cursorPositionRef.current.y - display.bounds.y) * scaleY;

            targetSx = Math.max(
              0,
              Math.min(scaledCursorX - targetWidth / 2, width - targetWidth)
            );
            targetSy = Math.max(
              0,
              Math.min(scaledCursorY - targetHeight / 2, height - targetHeight)
            );
          }
        }

        animationStateRef.current.endRect = {
          sx: targetSx,
          sy: targetSy,
          sWidth: targetWidth,
          sHeight: targetHeight,
        };
      } else {
        // We are zooming OUT
        animationStateRef.current.endRect = {
          sx: 0,
          sy: 0,
          sWidth: width,
          sHeight: height,
        };
      }
    }
  }, [isZoomedIn, displays, source.id]);

  useEffect(() => {
    const getWebcamStream = async () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (selectedWebcamId) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: selectedWebcamId },
            },
          });
          webcamStreamRef.current = stream;
          if (webcamPreviewRef.current) {
            webcamPreviewRef.current.srcObject = stream;
            webcamPreviewRef.current.play();
          }
        } catch (error) {
          console.error("Error accessing webcam.", error);
        }
      } else {
        if (webcamPreviewRef.current) {
          webcamPreviewRef.current.srcObject = null;
        }
        webcamStreamRef.current = null;
      }
    };

    getWebcamStream();

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedWebcamId]);

  useEffect(() => {
    getVideoStream();

    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [source]);

  const startRecording = async () => {
    setIsZoomedIn(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    recordedChunks.current = [];

    const videoStream = videoStreamRef.current;
    if (!videoStream) {
      console.error("Video stream not available");
      return;
    }

    let audioStream: MediaStream | null = null;
    if (selectedAudioSourceId) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: selectedAudioSourceId },
          },
          video: false,
        });
        audioStreamRef.current = audioStream;
      } catch (error) {
        console.error("Error accessing audio device.", error);
      }
    }

    const screenVideo = document.createElement("video");
    screenVideo.srcObject = videoStream;
    screenVideo.muted = true;
    screenVideo.play();

    await new Promise((resolve) => (screenVideo.onloadedmetadata = resolve));

    const canvas = document.createElement("canvas");
    canvas.width = screenVideo.videoWidth;
    canvas.height = screenVideo.videoHeight;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    // Initialize the source rectangle to the full video size
    sourceRectRef.current = {
      sx: 0,
      sy: 0,
      sWidth: screenVideo.videoWidth,
      sHeight: screenVideo.videoHeight,
    };

    // Standard easing function for smooth animations
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const drawFrames = () => {
      if (!ctx) return;

      const animState = animationStateRef.current;

      if (animState.isAnimating) {
        const now = performance.now();
        const elapsed = now - animState.startTime;
        const progress = Math.min(elapsed / animState.duration, 1);
        const easedProgress = easeInOutCubic(progress);

        sourceRectRef.current.sx =
          animState.startRect.sx +
          (animState.endRect.sx - animState.startRect.sx) * easedProgress;
        sourceRectRef.current.sy =
          animState.startRect.sy +
          (animState.endRect.sy - animState.startRect.sy) * easedProgress;
        sourceRectRef.current.sWidth =
          animState.startRect.sWidth +
          (animState.endRect.sWidth - animState.startRect.sWidth) *
            easedProgress;
        sourceRectRef.current.sHeight =
          animState.startRect.sHeight +
          (animState.endRect.sHeight - animState.startRect.sHeight) *
            easedProgress;

        if (progress >= 1) {
          animState.isAnimating = false;
        }
      } else if (isZoomedInRef.current) {
        // This is the "follow mode" panning logic
        let targetSx = sourceRectRef.current.sx;
        let targetSy = sourceRectRef.current.sy;
        const targetWidth = sourceRectRef.current.sWidth;
        const targetHeight = sourceRectRef.current.sHeight;

        if (source.id.startsWith("screen")) {
          const displayId = parseInt(source.id.split(":")[1], 10);
          const display = displays.find((d) => d.id === displayId);

          if (display) {
            const scaleX = screenVideo.videoWidth / display.bounds.width;
            const scaleY = screenVideo.videoHeight / display.bounds.height;
            const scaledCursorX =
              (cursorPositionRef.current.x - display.bounds.x) * scaleX;
            const scaledCursorY =
              (cursorPositionRef.current.y - display.bounds.y) * scaleY;

            targetSx = Math.max(
              0,
              Math.min(
                scaledCursorX - targetWidth / 2,
                screenVideo.videoWidth - targetWidth
              )
            );
            targetSy = Math.max(
              0,
              Math.min(
                scaledCursorY - targetHeight / 2,
                screenVideo.videoHeight - targetHeight
              )
            );
          }
        }

        const smoothing = settings.smoothing;
        sourceRectRef.current.sx +=
          (targetSx - sourceRectRef.current.sx) * smoothing;
        sourceRectRef.current.sy +=
          (targetSy - sourceRectRef.current.sy) * smoothing;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        screenVideo,
        sourceRectRef.current.sx,
        sourceRectRef.current.sy,
        sourceRectRef.current.sWidth,
        sourceRectRef.current.sHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (webcamStreamRef.current && webcamPreviewRef.current?.srcObject) {
        const webcamVideo = webcamPreviewRef.current;
        const webcamWidth = canvas.width / 4;
        const webcamHeight =
          webcamWidth *
          (webcamVideo.videoHeight / webcamVideo.videoWidth || 9 / 16);
        const webcamX = canvas.width - webcamWidth - 20;
        const webcamY = canvas.height - webcamHeight - 20;
        ctx.drawImage(webcamVideo, webcamX, webcamY, webcamWidth, webcamHeight);
      }

      animationFrameId.current = requestAnimationFrame(drawFrames);
    };

    drawFrames();

    const canvasStream = canvas.captureStream(30);
    const audioTracks = audioStream ? audioStream.getTracks() : [];
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    if (videoRef.current) {
      videoRef.current.srcObject = combinedStream;
      videoRef.current.play();
    }

    mediaRecorder.current = new MediaRecorder(combinedStream, {
      mimeType: "video/webm; codecs=vp9,opus",
    });

    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };
    mediaRecorder.current.onstop = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      combinedStream.getTracks().forEach((track) => track.stop());
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      const blob = new Blob(recordedChunks.current, {
        type: "video/webm; codecs=vp9,opus",
      });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.controls = true;
        videoRef.current.muted = false;
      }
      recordedChunks.current = [];
      setRecordingState("recorded");
    };

    mediaRecorder.current.start();
    setRecordingState("recording");
  };

  const pauseRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.pause();
      setRecordingState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.resume();
      setRecordingState("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsZoomedIn(false);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    }
  };

  const handleSave = async () => {
    if (videoUrl) {
      const blob = await fetch(videoUrl).then((r) => r.blob());
      const arrayBuffer = await blob.arrayBuffer();
      const filePath = await window.electronAPI.saveVideo(arrayBuffer);
      if (filePath) {
        console.log(`Video saved to ${filePath}`);
      }
    }
    getVideoStream();
  };

  const recordAgain = () => {
    setRecordingState("idle");
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    getVideoStream();
  };

  useEffect(() => {
    const handleShortcut = () => {
      if (recordingState === "recording" || recordingState === "paused") {
        stopRecording();
      } else if (recordingState === "idle") {
        startRecording();
      } else if (recordingState === "recorded") {
        recordAgain();
      }
    };

    const unsubscribe = window.electronAPI.onGlobalShortcut(handleShortcut);

    return () => {
      unsubscribe();
    };
  }, [recordingState, startRecording, stopRecording, recordAgain]);

  useEffect(() => {
    const handleShortcut = () => {
      if (recordingState === "recording") {
        pauseRecording();
      } else if (recordingState === "paused") {
        resumeRecording();
      }
    };

    const unsubscribe =
      window.electronAPI.onGlobalShortcutPauseResume(handleShortcut);

    return () => {
      unsubscribe();
    };
  }, [recordingState, pauseRecording, resumeRecording]);

  if (showEditor && videoUrl) {
    return <Editor videoUrl={videoUrl} onBack={() => setShowEditor(false)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-base-100 text-base-content">
      <div className="flex-grow p-4 flex flex-col gap-4">
        <div className="relative w-full aspect-video bg-black rounded-lg shadow-lg flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            muted={recordingState !== "recorded"}
          />
          <video
            ref={webcamPreviewRef}
            className="absolute bottom-5 right-5 w-1/4 rounded-lg border-2 border-base-content/50"
            autoPlay
            muted
            style={{ display: selectedWebcamId ? "block" : "none" }}
          />
        </div>

        {recordingState === "idle" && (
          <div className="flex flex-col gap-4 items-center">
            <div className="flex justify-center gap-4">
              <div className="form-control">
                <select
                  className="select select-bordered"
                  value={selectedAudioSourceId ?? "no-audio"}
                  onChange={(e) =>
                    setSelectedAudioSourceId(
                      e.target.value === "no-audio" ? null : e.target.value
                    )
                  }
                >
                  <option value="no-audio">No Audio</option>
                  {audioSources.map((source) => (
                    <option key={source.deviceId} value={source.deviceId}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <select
                  className="select select-bordered"
                  value={selectedWebcamId ?? "no-webcam"}
                  onChange={(e) =>
                    setSelectedWebcamId(
                      e.target.value === "no-webcam" ? null : e.target.value
                    )
                  }
                >
                  <option value="no-webcam">No Webcam</option>
                  {webcamSources.map((source) => (
                    <option key={source.deviceId} value={source.deviceId}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <span className="label-text">Auto Zoom & Pan</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={autoZoomPan}
                  onChange={(e) => setAutoZoomPan(e.target.checked)}
                  disabled={!source.id.startsWith("screen")}
                />
              </label>
              {!source.id.startsWith("screen") && (
                <div className="text-xs text-base-content/50 text-center">
                  (Screen sources only)
                </div>
              )}
            </div>
            <div className="collapse bg-base-200 max-w-lg">
              <input
                type="checkbox"
                checked={showSettings}
                onChange={() => setShowSettings(!showSettings)}
                disabled={!autoZoomPan}
              />
              <div className="collapse-title text-xl font-medium flex items-center gap-2">
                <FaCog />
                Auto-Zoom Settings
              </div>
              <div className="collapse-content">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Zoom Strength</span>
                    <span className="label-text-alt">
                      {settings.zoomFactor.toFixed(1)}x
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1.5"
                    max="5"
                    step="0.1"
                    value={settings.zoomFactor}
                    className="range range-sm"
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        zoomFactor: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Animation Speed</span>
                    <span className="label-text-alt">
                      {settings.animationDuration}ms
                    </span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={settings.animationDuration}
                    className="range range-sm"
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        animationDuration: parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Follow Tightness</span>
                    <span className="label-text-alt">
                      {settings.smoothing.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={settings.smoothing}
                    className="range range-sm"
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        smoothing: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Inactivity Timeout</span>
                    <span className="label-text-alt">
                      {(settings.inactivityTimeout / 1000).toFixed(1)}s
                    </span>
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={settings.inactivityTimeout}
                    className="range range-sm"
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        inactivityTimeout: parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-base-300 flex justify-center items-center gap-4">
        {recordingState === "idle" && (
          <button className="btn btn-primary btn-lg" onClick={startRecording}>
            <FaPlay className="mr-2" /> Start Recording
          </button>
        )}
        {recordingState === "recording" && (
          <>
            <button className="btn btn-warning" onClick={pauseRecording}>
              <FaPause className="mr-2" /> Pause
            </button>
            <button className="btn btn-error" onClick={stopRecording}>
              <FaStop className="mr-2" /> Stop
            </button>
          </>
        )}
        {recordingState === "paused" && (
          <>
            <button className="btn btn-success" onClick={resumeRecording}>
              <FaPlay className="mr-2" /> Resume
            </button>
            <button className="btn btn-error" onClick={stopRecording}>
              <FaStop className="mr-2" /> Stop
            </button>
          </>
        )}
        {recordingState === "recorded" && (
          <>
            <button className="btn btn-success" onClick={handleSave}>
              <FaSave className="mr-2" /> Save
            </button>
            <button className="btn" onClick={recordAgain}>
              <FaRedo className="mr-2" /> Record Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowEditor(true)}
            >
              <FaEdit className="mr-2" /> Edit
            </button>
          </>
        )}
        <button className="btn btn-ghost" onClick={clearSource}>
          <FaArrowLeft className="mr-2" />
          Choose another source
        </button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
