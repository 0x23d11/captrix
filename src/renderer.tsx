import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Editor from "./Editor";
import Settings, { AppSettings, loadSettings } from "./Settings";
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
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    // Load settings and apply theme immediately
    const settings = loadSettings();
    return settings;
  });

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

  const handleSettingsChange = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
  };

  if (showSettings) {
    return (
      <Settings
        onBack={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  if (selectedSource) {
    return (
      <Recorder
        source={selectedSource}
        clearSource={() => setSelectedSource(null)}
        settings={appSettings}
      />
    );
  }

  if (!sourceType) {
    return (
      <div className="flex flex-col items-center justify-center h-screen relative overflow-hidden">
        {/* Settings Button */}
        <button
          className="absolute top-6 right-6 btn btn-ghost btn-circle z-20 hover:bg-base-300/50 transition-smooth focus-modern"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <FaCog className="text-xl" />
        </button>

        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-base-100 via-base-200 to-base-300 opacity-20"></div>
        <div className="absolute inset-0 opacity-30">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-hero mb-6">What do you want to record?</h1>
            <p className="text-subtitle max-w-2xl mx-auto">
              Choose your recording source to get started. Captrix offers
              professional-grade screen recording with advanced editing
              capabilities.
            </p>
          </div>

          {/* Action Cards */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch">
            <button
              className="card-modern glass-hover group p-8 min-w-[280px] transition-smooth focus-modern"
              onClick={() => setSourceType("screen")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-smooth glow-primary">
                  <FaDesktop className="text-2xl text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Entire Screen</h3>
                <p className="text-base-content/70 text-sm">
                  Capture everything on your screen with crystal clear quality
                </p>
              </div>
            </button>

            <button
              className="card-modern glass-hover group p-8 min-w-[280px] transition-smooth focus-modern"
              onClick={() => setSourceType("window")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-secondary/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-secondary/30 transition-smooth">
                  <FaWindowMaximize className="text-2xl text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">App Window</h3>
                <p className="text-base-content/70 text-sm">
                  Focus on a specific application window for targeted recording
                </p>
              </div>
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="text-center p-4">
              <div className="w-8 h-8 bg-accent/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-accent text-sm">✨</span>
              </div>
              <p className="text-sm text-base-content/60">Auto Zoom & Pan</p>
            </div>
            <div className="text-center p-4">
              <div className="w-8 h-8 bg-accent/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-accent text-sm">✂️</span>
              </div>
              <p className="text-sm text-base-content/60">Advanced Editing</p>
            </div>
            <div className="text-center p-4">
              <div className="w-8 h-8 bg-accent/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-accent text-sm">🎥</span>
              </div>
              <p className="text-sm text-base-content/60">Multiple Formats</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-base-100 via-base-200 to-base-300 opacity-20"></div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              className="btn btn-ghost btn-circle mr-4 hover:bg-base-300/50 transition-smooth focus-modern"
              onClick={() => setSourceType(null)}
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-base-content">
                Select a {sourceType === "screen" ? "Screen" : "Window"}
              </h1>
              <p className="text-base-content/70 mt-1">
                Choose the {sourceType === "screen" ? "display" : "application"}{" "}
                you want to record
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-circle hover:bg-base-300/50 transition-smooth focus-modern"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <FaCog className="text-xl" />
          </button>
        </div>

        {/* Source Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSources.length > 0 ? (
            filteredSources.map((source) => (
              <div
                key={source.id}
                className="card-modern glass-hover cursor-pointer group overflow-hidden focus-modern"
                onClick={() => selectSource(source)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectSource(source);
                  }
                }}
              >
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={source.thumbnailURL}
                    alt={source.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-4">
                  <h3
                    className="font-semibold text-base-content truncate"
                    title={source.name}
                  >
                    {source.name}
                  </h3>
                  <p className="text-sm text-base-content/60 mt-1">
                    {sourceType === "screen" ? "Display" : "Application"} Source
                  </p>
                </div>

                {/* Hover Indicator */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white text-sm">▶</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="card-modern text-center p-12 max-w-md mx-auto">
                <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-warning text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  No {sourceType === "screen" ? "screens" : "windows"} found
                </h3>
                <p className="text-base-content/70 mb-6">
                  Please ensure you have granted screen recording permissions in
                  your System Settings.
                </p>
                <button
                  className="btn btn-primary btn-modern"
                  onClick={() =>
                    window.electronAPI.getSources().then(setAllSources)
                  }
                >
                  Refresh Sources
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Recorder = ({
  source,
  clearSource,
  settings: globalSettings,
}: {
  source: Source;
  clearSource: () => void;
  settings: AppSettings;
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
  const [autoZoomPan, setAutoZoomPan] = useState(
    globalSettings.recording.autoZoomEnabled
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    zoomFactor: 2,
    animationDuration: 600,
    smoothing: 0.05,
    inactivityTimeout: globalSettings.recording.autoZoomSensitivity * 400, // Convert sensitivity to timeout
    videoQuality: globalSettings.recording.defaultQuality,
    videoBitrate: getVideoBitrateForQuality(
      globalSettings.recording.defaultQuality
    ),
    audioBitrate: 320000, // 320 kbps
  });

  // Update settings when globalSettings change
  useEffect(() => {
    setAutoZoomPan(globalSettings.recording.autoZoomEnabled);
    setSettings((prev) => ({
      ...prev,
      inactivityTimeout: globalSettings.recording.autoZoomSensitivity * 400,
      videoQuality: globalSettings.recording.defaultQuality,
      videoBitrate: getVideoBitrateForQuality(
        globalSettings.recording.defaultQuality
      ),
    }));
  }, [globalSettings]);

  // Helper function to get video bitrate based on quality
  function getVideoBitrateForQuality(
    quality: "low" | "medium" | "high" | "ultra"
  ): number {
    const qualityPresets = {
      low: 1000000, // 1 Mbps
      medium: 3000000, // 3 Mbps
      high: 8000000, // 8 Mbps
      ultra: 20000000, // 20 Mbps
    };
    return qualityPresets[quality];
  }

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
  const keyboardActivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isZoomedInRef = React.useRef(isZoomedIn);
  isZoomedInRef.current = isZoomedIn;

  // Function to update bitrates based on quality preset
  const updateQualitySettings = (
    quality: "low" | "medium" | "high" | "ultra"
  ) => {
    const qualityPresets = {
      low: { videoBitrate: 1000000, audioBitrate: 64000 }, // 1 Mbps, 64 kbps
      medium: { videoBitrate: 3000000, audioBitrate: 128000 }, // 3 Mbps, 128 kbps
      high: { videoBitrate: 8000000, audioBitrate: 320000 }, // 8 Mbps, 320 kbps
      ultra: { videoBitrate: 20000000, audioBitrate: 320000 }, // 20 Mbps, 320 kbps
    };

    const preset = qualityPresets[quality];
    setSettings((s) => ({
      ...s,
      videoQuality: quality,
      videoBitrate: preset.videoBitrate,
      audioBitrate: preset.audioBitrate,
    }));
  };

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
      // Clear existing timer
      if (keyboardActivityTimerRef.current) {
        clearTimeout(keyboardActivityTimerRef.current);
      }

      // Set a small delay to only trigger zoom after sustained activity
      keyboardActivityTimerRef.current = setTimeout(() => {
        // On sustained keyboard activity, zoom to the cursor's last known position.
        handleMouseAction(cursorPositionRef.current);
      }, 200); // 200ms delay to filter out single key presses
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
      if (keyboardActivityTimerRef.current) {
        clearTimeout(keyboardActivityTimerRef.current);
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
      videoBitsPerSecond: settings.videoBitrate,
      audioBitsPerSecond: settings.audioBitrate,
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
    return (
      <Editor
        videoUrl={videoUrl}
        onBack={() => setShowEditor(false)}
        settings={globalSettings}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-base-100 via-base-200 to-base-300 opacity-20"></div>

      {/* Header */}
      <div className="relative z-10 p-4 lg:p-6">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost btn-circle hover:bg-base-300/50 transition-smooth focus-modern"
            onClick={clearSource}
            title="Choose another source"
          >
            <FaArrowLeft className="text-lg" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-base-content">
              Recording Setup
            </h1>
            <p className="text-sm lg:text-base text-base-content/70">
              Configure your recording settings and start capturing
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 lg:px-6 pb-32">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Video Preview - Left Column */}
            <div className="flex-1 min-w-0">
              <div className="relative w-full aspect-video glass rounded-2xl overflow-hidden shadow-2xl group">
                {/* Recording Status Indicator */}
                {recordingState === "recording" && (
                  <div className="absolute top-3 left-3 lg:top-4 lg:left-4 z-20">
                    <div className="flex items-center gap-2 status-recording px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium">
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-current rounded-full animate-pulse"></div>
                      REC
                    </div>
                  </div>
                )}

                {recordingState === "paused" && (
                  <div className="absolute top-3 left-3 lg:top-4 lg:left-4 z-20">
                    <div className="flex items-center gap-2 status-paused px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium">
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-current rounded-full"></div>
                      PAUSED
                    </div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black/50"
                  autoPlay
                  muted={recordingState !== "recorded"}
                />

                {/* Webcam Overlay */}
                <video
                  ref={webcamPreviewRef}
                  className="absolute bottom-3 right-3 lg:bottom-6 lg:right-6 w-1/4 max-w-[120px] lg:max-w-[200px] rounded-lg lg:rounded-xl border-2 border-white/20 shadow-lg backdrop-blur-sm transition-smooth group-hover:border-white/40"
                  autoPlay
                  muted
                  style={{ display: selectedWebcamId ? "block" : "none" }}
                />

                {/* Video Controls Overlay */}
                {recordingState === "recorded" && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="glass px-4 py-2 lg:px-6 lg:py-3 rounded-xl">
                      <p className="text-white text-xs lg:text-sm font-medium">
                        Video ready for editing
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Panel - Right Column */}
            <div className="w-full lg:w-96 xl:w-[28rem] space-y-6">
              {recordingState === "idle" && (
                <>
                  {/* Device Selection */}
                  <div className="card-modern p-4 lg:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <FaCog className="text-primary text-sm" />
                      </span>
                      Recording Settings
                    </h3>

                    <div className="space-y-4">
                      <div className="form-control-modern">
                        <label className="label">
                          <span className="label-text">Audio Source</span>
                        </label>
                        <select
                          className="select select-bordered w-full focus-modern"
                          value={selectedAudioSourceId ?? "no-audio"}
                          onChange={(e) =>
                            setSelectedAudioSourceId(
                              e.target.value === "no-audio"
                                ? null
                                : e.target.value
                            )
                          }
                        >
                          <option value="no-audio">🔇 No Audio</option>
                          {audioSources.map((source) => (
                            <option
                              key={source.deviceId}
                              value={source.deviceId}
                            >
                              🎤 {source.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control-modern">
                        <label className="label">
                          <span className="label-text">Webcam</span>
                        </label>
                        <select
                          className="select select-bordered w-full focus-modern"
                          value={selectedWebcamId ?? "no-webcam"}
                          onChange={(e) =>
                            setSelectedWebcamId(
                              e.target.value === "no-webcam"
                                ? null
                                : e.target.value
                            )
                          }
                        >
                          <option value="no-webcam">📷 No Webcam</option>
                          {webcamSources.map((source) => (
                            <option
                              key={source.deviceId}
                              value={source.deviceId}
                            >
                              📹 {source.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control-modern">
                        <label className="label">
                          <span className="label-text">Recording Quality</span>
                        </label>
                        <select
                          className="select select-bordered w-full focus-modern"
                          value={settings.videoQuality}
                          onChange={(e) =>
                            updateQualitySettings(
                              e.target.value as
                                | "low"
                                | "medium"
                                | "high"
                                | "ultra"
                            )
                          }
                        >
                          <option value="low">
                            🔸 Low (1 Mbps) - Small files
                          </option>
                          <option value="medium">
                            🔹 Medium (3 Mbps) - Balanced
                          </option>
                          <option value="high">
                            ⭐ High (8 Mbps) - Recommended
                          </option>
                          <option value="ultra">
                            💎 Ultra (20 Mbps) - Best quality
                          </option>
                        </select>
                        <div className="text-xs text-base-content/60 mt-1">
                          Higher quality = larger file sizes. Ultra quality
                          recommended for professional use.
                        </div>
                      </div>
                    </div>

                    {/* Auto Zoom Toggle */}
                    <div className="divider my-4"></div>
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4">
                        <div className="flex-1">
                          <span className="label-text font-medium">
                            Auto Zoom & Pan
                          </span>
                          <div className="text-xs text-base-content/60 mt-1">
                            Automatically follow cursor movement
                            {!source.id.startsWith("screen") &&
                              " (Screen sources only)"}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-modern"
                          checked={autoZoomPan}
                          onChange={(e) => setAutoZoomPan(e.target.checked)}
                          disabled={!source.id.startsWith("screen")}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  {autoZoomPan && (
                    <div className="card-modern p-4 lg:p-6 transition-smooth">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                          <span className="text-accent text-sm">⚡</span>
                        </span>
                        Auto-Zoom Settings
                      </h3>

                      <div className="space-y-6">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Zoom Strength</span>
                            <span className="label-text-alt badge badge-primary badge-sm">
                              {settings.zoomFactor.toFixed(1)}x
                            </span>
                          </label>
                          <input
                            type="range"
                            min="1.5"
                            max="5"
                            step="0.1"
                            value={settings.zoomFactor}
                            className="range range-primary range-sm"
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
                            <span className="label-text-alt badge badge-secondary badge-sm">
                              {settings.animationDuration}ms
                            </span>
                          </label>
                          <input
                            type="range"
                            min="100"
                            max="1500"
                            step="50"
                            value={settings.animationDuration}
                            className="range range-secondary range-sm"
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
                            <span className="label-text-alt badge badge-accent badge-sm">
                              {settings.smoothing.toFixed(2)}
                            </span>
                          </label>
                          <input
                            type="range"
                            min="0.01"
                            max="0.2"
                            step="0.01"
                            value={settings.smoothing}
                            className="range range-accent range-sm"
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
                            <span className="label-text">
                              Inactivity Timeout
                            </span>
                            <span className="label-text-alt badge badge-warning badge-sm">
                              {(settings.inactivityTimeout / 1000).toFixed(1)}s
                            </span>
                          </label>
                          <input
                            type="range"
                            min="500"
                            max="5000"
                            step="100"
                            value={settings.inactivityTimeout}
                            className="range range-warning range-sm"
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
                  )}
                </>
              )}

              {/* Quick Actions for Non-Idle States */}
              {recordingState !== "idle" && (
                <div className="card-modern p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {recordingState === "recorded" && (
                      <>
                        <button
                          className="btn btn-secondary btn-modern w-full"
                          onClick={() => setShowEditor(true)}
                        >
                          <FaEdit className="mr-2" /> Edit Video
                        </button>
                        <button
                          className="btn btn-success btn-modern w-full"
                          onClick={handleSave}
                        >
                          <FaSave className="mr-2" /> Save Video
                        </button>
                        <button
                          className="btn btn-ghost btn-modern w-full"
                          onClick={recordAgain}
                        >
                          <FaRedo className="mr-2" /> Record Again
                        </button>
                      </>
                    )}
                    {(recordingState === "recording" ||
                      recordingState === "paused") && (
                      <div className="text-center p-4 bg-base-200/50 rounded-lg">
                        <p className="text-sm text-base-content/70">
                          Use the controls below to manage your recording
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 lg:p-6">
        <div className="container mx-auto">
          <div className="glass rounded-2xl p-3 lg:p-4">
            <div className="flex justify-center items-center gap-3 lg:gap-4 flex-wrap">
              {recordingState === "idle" && (
                <button
                  className="btn btn-primary btn-lg btn-modern glow-primary px-6 lg:px-8"
                  onClick={startRecording}
                >
                  <FaPlay className="mr-2" /> Start Recording
                </button>
              )}

              {recordingState === "recording" && (
                <>
                  <button
                    className="btn btn-warning btn-modern"
                    onClick={pauseRecording}
                  >
                    <FaPause className="mr-2" /> Pause
                  </button>
                  <button
                    className="btn btn-error btn-modern glow-error"
                    onClick={stopRecording}
                  >
                    <FaStop className="mr-2" /> Stop
                  </button>
                </>
              )}

              {recordingState === "paused" && (
                <>
                  <button
                    className="btn btn-success btn-modern glow-accent"
                    onClick={resumeRecording}
                  >
                    <FaPlay className="mr-2" /> Resume
                  </button>
                  <button
                    className="btn btn-error btn-modern glow-error"
                    onClick={stopRecording}
                  >
                    <FaStop className="mr-2" /> Stop
                  </button>
                </>
              )}

              {recordingState === "recorded" && (
                <div className="text-center">
                  <p className="text-sm text-base-content/70 mb-2">
                    Recording complete! Use the panel on the right for actions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
