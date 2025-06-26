import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

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
      <div className="source-selector">
        <h1>What do you want to record?</h1>
        <div className="source-types">
          <button onClick={() => setSourceType("screen")}>
            Record Entire Screen
          </button>
          <button onClick={() => setSourceType("window")}>
            Record an App Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="source-selector">
      <div className="source-types">
        <button onClick={() => setSourceType(null)}>Back</button>
      </div>
      <h1>Select a {sourceType === "screen" ? "Screen" : "Window"}</h1>
      <div className="sources">
        {filteredSources.length > 0 ? (
          filteredSources.map((source) => (
            <button key={source.id} onClick={() => selectSource(source)}>
              <img src={source.thumbnailURL} alt={source.name} />
              <span>{source.name}</span>
            </button>
          ))
        ) : (
          <div className="no-sources">
            <p>No {sourceType === "screen" ? "screens" : "windows"} found.</p>
            <p>
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
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const cursorPositionRef = React.useRef({ x: 0, y: 0 });
  const [displays, setDisplays] = useState<Display[]>([]);
  const sourceRectRef = React.useRef({ sx: 0, sy: 0, sWidth: 0, sHeight: 0 });

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
      }, 2000); // 2 seconds of inactivity
    };

    const handleMouseMove = (position: { x: number; y: number }) => {
      if (isZoomedInRef.current) {
        handleMouseAction(position);
      }
    };

    window.electronAPI.startMouseEventTracking();
    const unsubscribeClick = window.electronAPI.onMouseClick(handleMouseAction);
    const unsubscribeMove = window.electronAPI.onMouseMove(handleMouseMove);

    return () => {
      window.electronAPI.stopMouseEventTracking();
      unsubscribeClick();
      unsubscribeMove();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [autoZoomPan, recordingState, displays, source.id]);

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
    sourceRectRef.current = { sx: 0, sy: 0, sWidth: 0, sHeight: 0 };

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

    const drawFrames = () => {
      if (!ctx) return;

      let targetSx = 0;
      let targetSy = 0;
      let targetWidth = screenVideo.videoWidth;
      let targetHeight = screenVideo.videoHeight;

      if (
        autoZoomPan &&
        isZoomedInRef.current &&
        source.id.startsWith("screen")
      ) {
        const displayId = parseInt(source.id.split(":")[1], 10);
        const display = displays.find((d) => d.id === displayId);

        if (display) {
          const zoomFactor = 2;
          targetWidth = screenVideo.videoWidth / zoomFactor;
          targetHeight = screenVideo.videoHeight / zoomFactor;

          // Scale cursor position from display coordinates to video coordinates
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

      if (
        sourceRectRef.current.sWidth === 0 &&
        sourceRectRef.current.sHeight === 0
      ) {
        sourceRectRef.current = {
          sx: 0,
          sy: 0,
          sWidth: screenVideo.videoWidth,
          sHeight: screenVideo.videoHeight,
        };
      }

      // A lower value creates a smoother, slower transition.
      const smoothing = 0.05;
      sourceRectRef.current.sx +=
        (targetSx - sourceRectRef.current.sx) * smoothing;
      sourceRectRef.current.sy +=
        (targetSy - sourceRectRef.current.sy) * smoothing;
      sourceRectRef.current.sWidth +=
        (targetWidth - sourceRectRef.current.sWidth) * smoothing;
      sourceRectRef.current.sHeight +=
        (targetHeight - sourceRectRef.current.sHeight) * smoothing;

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

  return (
    <div className="recorder">
      <div className="preview">
        <video
          ref={videoRef}
          className="main-preview"
          autoPlay
          muted={recordingState !== "recorded"}
        />
        <video
          ref={webcamPreviewRef}
          className="webcam-preview"
          autoPlay
          muted
          style={{ display: selectedWebcamId ? "block" : "none" }}
        />
      </div>
      {recordingState === "idle" && (
        <>
          <div className="media-selectors">
            <div className="audio-selector">
              <select
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
            <div className="webcam-selector">
              <select
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
          <div className="enhancements">
            <label>
              <input
                type="checkbox"
                checked={autoZoomPan}
                onChange={(e) => setAutoZoomPan(e.target.checked)}
                disabled={!source.id.startsWith("screen")}
              />
              Auto Zoom & Pan
              {!source.id.startsWith("screen") && (
                <span> (Screen sources only)</span>
              )}
            </label>
          </div>
        </>
      )}
      <div className="controls">
        {recordingState === "idle" && (
          <button onClick={startRecording}>Start</button>
        )}
        {recordingState === "recording" && (
          <>
            <button onClick={pauseRecording}>Pause</button>
            <button onClick={stopRecording}>Stop</button>
          </>
        )}
        {recordingState === "paused" && (
          <>
            <button onClick={resumeRecording}>Resume</button>
            <button onClick={stopRecording}>Stop</button>
          </>
        )}
        {recordingState === "recorded" && (
          <>
            <button onClick={handleSave}>Save</button>
            <button onClick={recordAgain}>Record Again</button>
          </>
        )}
        <button onClick={clearSource}>Choose another source</button>
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
