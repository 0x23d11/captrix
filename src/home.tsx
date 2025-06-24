import React, { useEffect, useRef, useState } from "react";

interface CapturerSource {
  id: string;
  name: string;
  thumbnailURL: string;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropInfo {
  rect: SelectionRect;
  scaleFactor: number;
}

const VIDEO_QUALITY_BITRATES: Record<string, number> = {
  Low: 250_000, // 0.25 Mbps - Intentionally very low to make the difference obvious
  Medium: 2_500_000, // 2.5 Mbps
  High: 5_000_000, // 5 Mbps
};

declare global {
  interface Window {
    electronAPI: {
      getSources: (types: ("window" | "screen")[]) => Promise<CapturerSource[]>;
      saveRecording: (buffer: Uint8Array) => void;
      send: (channel: string, data?: any) => void;
      selectArea: () => Promise<CropInfo | null>;
    };
  }
}

type RecordingStatus = "idle" | "preparing" | "recording" | "stopping";

const OptionButton = ({
  children,
  selected,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none ${
      selected
        ? "border-green-400 bg-green-900/50 text-green-300 shadow-md"
        : "border-gray-600 bg-gray-800/80 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
  </button>
);

const SettingsSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-gray-200 mb-4">{title}</h2>
    <div className="flex flex-wrap gap-4">{children}</div>
  </div>
);

export default function Home({
  onRecordingComplete,
}: {
  onRecordingComplete: (blob: Blob) => void;
}) {
  const [sources, setSources] = useState<CapturerSource[]>([]);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const combinedStream = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamSources = useRef<{
    screen?: MediaStream;
    webcam?: MediaStream;
    mic?: MediaStream;
    composited?: MediaStream;
  }>({});

  const [view, setView] = useState<"settings" | "select-source">("settings");

  const [recordingArea, setRecordingArea] = useState("Specific Window");
  const [audioInput, setAudioInput] = useState("None");
  const [videoQuality, setVideoQuality] = useState("High");
  const [frameRate, setFrameRate] = useState(60);
  const [includeWebcam, setIncludeWebcam] = useState(true);
  const [resolution, setResolution] = useState("Source");

  useEffect(() => {
    if (view === "select-source") {
      const sourceTypes: ("window" | "screen")[] =
        recordingArea === "Entire Screen" || recordingArea === "Custom Area"
          ? ["screen"]
          : ["window"];
      window.electronAPI.getSources(sourceTypes).then(setSources);
    }
  }, [view, recordingArea]);

  const startRecording = async (
    source: CapturerSource,
    cropInfo?: CropInfo
  ) => {
    setStatus("preparing");
    setView("settings");

    const RESOLUTIONS: Record<
      string,
      { width: number; height: number } | null
    > = {
      Source: null,
      "1080p": { width: 1920, height: 1080 },
      "720p": { width: 1280, height: 720 },
    };

    try {
      let videoStream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
            frameRate: {
              ideal: frameRate,
              max: frameRate,
            },
          },
        } as any,
      });

      streamSources.current.screen = videoStream;

      const needsCanvas = includeWebcam || resolution !== "Source" || cropInfo;

      if (needsCanvas) {
        const screenVideoEl = document.createElement("video");
        const screenReadyPromise = new Promise<void>((resolve, reject) => {
          screenVideoEl.onloadeddata = () => resolve();
          screenVideoEl.onerror = (e) => reject(e);
        });
        screenVideoEl.srcObject = videoStream;
        screenVideoEl.muted = true;
        screenVideoEl.play();

        let webcamVideoEl: HTMLVideoElement;
        let webcamReadyPromise = Promise.resolve();

        if (includeWebcam) {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          streamSources.current.webcam = webcamStream;
          webcamVideoEl = document.createElement("video");
          webcamReadyPromise = new Promise<void>((resolve, reject) => {
            webcamVideoEl.onloadeddata = () => resolve();
            webcamVideoEl.onerror = (e) => reject(e);
          });
          webcamVideoEl.srcObject = webcamStream;
          webcamVideoEl.muted = true;
          webcamVideoEl.play();
        }

        await Promise.all([screenReadyPromise, webcamReadyPromise]);

        const screenSettings = videoStream.getVideoTracks()[0].getSettings();

        // Determine source rect (for cropping)
        let sx = 0,
          sy = 0,
          sWidth = screenSettings.width,
          sHeight = screenSettings.height;

        if (cropInfo) {
          const { rect, scaleFactor } = cropInfo;
          sx = rect.x * scaleFactor;
          sy = rect.y * scaleFactor;
          sWidth = rect.width * scaleFactor;
          sHeight = rect.height * scaleFactor;
        }

        // Determine canvas dimensions (for scaling)
        const sourceAspectRatio = sWidth / sHeight;
        let canvasWidth = sWidth;
        let canvasHeight = sHeight;
        const targetRes = RESOLUTIONS[resolution];

        if (
          targetRes &&
          (canvasWidth > targetRes.width || canvasHeight > targetRes.height)
        ) {
          if (sourceAspectRatio > targetRes.width / targetRes.height) {
            canvasWidth = targetRes.width;
            canvasHeight = canvasWidth / sourceAspectRatio;
          } else {
            canvasHeight = targetRes.height;
            canvasWidth = canvasHeight * sourceAspectRatio;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(canvasWidth / 2) * 2;
        canvas.height = Math.round(canvasHeight / 2) * 2;
        const ctx = canvas.getContext("2d");

        const drawFrames = () => {
          // Draw screen (cropped and scaled)
          ctx.drawImage(
            screenVideoEl,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );

          if (webcamVideoEl) {
            const webcamWidth = canvas.width / 5;
            const webcamHeight =
              (webcamVideoEl.videoHeight / webcamVideoEl.videoWidth) *
              webcamWidth;
            const margin = 20;

            ctx.drawImage(
              webcamVideoEl,
              canvas.width - webcamWidth - margin,
              canvas.height - webcamHeight - margin,
              webcamWidth,
              webcamHeight
            );
          }
          animationFrameId.current = requestAnimationFrame(drawFrames);
        };
        drawFrames();

        videoStream = canvas.captureStream(frameRate);
        streamSources.current.composited = videoStream;
      }

      combinedStream.current = new MediaStream();
      videoStream.getVideoTracks().forEach((track) => {
        combinedStream.current.addTrack(track);
      });

      if (audioInput === "Microphone" || audioInput === "Both") {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        streamSources.current.mic = audioStream;
        audioStream
          .getAudioTracks()
          .forEach((track) => combinedStream.current.addTrack(track));
      }

      mediaRecorder.current = new MediaRecorder(combinedStream.current, {
        mimeType: "video/webm; codecs=vp9",
        videoBitsPerSecond: VIDEO_QUALITY_BITRATES[videoQuality],
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, {
          type: "video/webm; codecs=vp9",
        });

        // Clean up resources
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }

        Object.values(streamSources.current).forEach((stream) =>
          stream?.getTracks().forEach((track) => track.stop())
        );

        combinedStream.current?.getTracks().forEach((track) => track.stop());

        // Reset state for next recording
        recordedChunks.current = [];
        combinedStream.current = null;
        streamSources.current = {};
        setStatus("idle");
        setView("settings");

        // Pass blob to the parent component to navigate to the editor
        onRecordingComplete(blob);
      };

      mediaRecorder.current.start();
      setStatus("recording");
    } catch (error) {
      console.error("Error starting recording:", error);
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (status !== "recording") return;
    setStatus("stopping");
    mediaRecorder.current?.stop();
  };

  const handleRecordClick = async () => {
    if (status === "recording") {
      stopRecording();
      return;
    }
    if (recordingArea === "Custom Area") {
      const cropInfo = await window.electronAPI.selectArea();
      if (cropInfo) {
        const sources = await window.electronAPI.getSources(["screen"]);
        if (sources.length > 0) {
          startRecording(sources[0], cropInfo);
        } else {
          console.error("No screen sources found for custom area recording.");
        }
      }
    } else {
      setView("select-source");
    }
  };

  if (view === "select-source") {
    return (
      <div className="bg-[#111312] text-white min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-2">Select a Source</h1>
        <p className="text-gray-400 mb-8">
          Choose which {recordingArea.toLowerCase()} you want to record.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sources.map((source) => (
            <div
              key={source.id}
              onClick={() => startRecording(source)}
              className="border-2 border-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:border-green-500 hover:shadow-lg"
            >
              <img
                src={source.thumbnailURL}
                alt={source.name}
                className="w-full h-32 object-cover"
              />
              <div className="p-3 bg-gray-800">
                <h2 className="text-sm font-semibold truncate">
                  {source.name}
                </h2>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <button
            onClick={() => setView("settings")}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111312] text-white min-h-screen font-sans flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-gray-800/50">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-white rounded-md"></div>
          <span className="text-lg font-bold">Captrix</span>
        </div>
        <nav className="flex items-center space-x-6 text-sm">
          <a href="#" className="text-white font-semibold">
            Home
          </a>
          <a href="#" className="text-gray-400 hover:text-white">
            My Recordings
          </a>
          <a href="#" className="text-gray-400 hover:text-white">
            Settings
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400 font-bold">
            ?
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-600"></div>
        </div>
      </header>

      <main className="flex-grow p-12 overflow-y-auto">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold mb-2">Start Recording</h1>
          <p className="text-gray-400 mb-10">
            Choose what you want to record and adjust your settings.
          </p>

          <SettingsSection title="Recording Area">
            <OptionButton
              selected={recordingArea === "Entire Screen"}
              onClick={() => setRecordingArea("Entire Screen")}
            >
              Entire Screen
            </OptionButton>
            <OptionButton
              selected={recordingArea === "Specific Window"}
              onClick={() => setRecordingArea("Specific Window")}
            >
              Specific Window
            </OptionButton>
            <OptionButton
              selected={recordingArea === "Custom Area"}
              onClick={() => setRecordingArea("Custom Area")}
            >
              Custom Area
            </OptionButton>
          </SettingsSection>

          <SettingsSection title="Audio Input">
            <OptionButton
              selected={audioInput === "System Audio"}
              onClick={() => setAudioInput("System Audio")}
              disabled
            >
              System Audio
            </OptionButton>
            <OptionButton
              selected={audioInput === "Microphone"}
              onClick={() => setAudioInput("Microphone")}
            >
              Microphone
            </OptionButton>
            <OptionButton
              selected={audioInput === "Both"}
              onClick={() => setAudioInput("Both")}
              disabled
            >
              Both
            </OptionButton>
            <OptionButton
              selected={audioInput === "None"}
              onClick={() => setAudioInput("None")}
            >
              None
            </OptionButton>
          </SettingsSection>

          <SettingsSection title="Webcam Overlay">
            <OptionButton
              selected={includeWebcam}
              onClick={() => setIncludeWebcam(true)}
            >
              On
            </OptionButton>
            <OptionButton
              selected={!includeWebcam}
              onClick={() => setIncludeWebcam(false)}
            >
              Off
            </OptionButton>
          </SettingsSection>

          <SettingsSection title="Resolution">
            <OptionButton
              selected={resolution === "Source"}
              onClick={() => setResolution("Source")}
            >
              Source
            </OptionButton>
            <OptionButton
              selected={resolution === "1080p"}
              onClick={() => setResolution("1080p")}
            >
              1080p
            </OptionButton>
            <OptionButton
              selected={resolution === "720p"}
              onClick={() => setResolution("720p")}
            >
              720p
            </OptionButton>
          </SettingsSection>

          <SettingsSection title="Video Quality">
            <OptionButton
              selected={videoQuality === "High"}
              onClick={() => setVideoQuality("High")}
            >
              High
            </OptionButton>
            <OptionButton
              selected={videoQuality === "Medium"}
              onClick={() => setVideoQuality("Medium")}
            >
              Medium
            </OptionButton>
            <OptionButton
              selected={videoQuality === "Low"}
              onClick={() => setVideoQuality("Low")}
            >
              Low
            </OptionButton>
          </SettingsSection>

          <SettingsSection title="Frame Rate">
            <OptionButton
              selected={frameRate === 60}
              onClick={() => setFrameRate(60)}
            >
              60 FPS
            </OptionButton>
            <OptionButton
              selected={frameRate === 30}
              onClick={() => setFrameRate(30)}
            >
              30 FPS
            </OptionButton>
          </SettingsSection>
        </div>
      </main>

      <footer className="p-6 flex justify-end border-t border-gray-800/50">
        <button
          onClick={handleRecordClick}
          disabled={status === "preparing" || status === "stopping"}
          className="bg-brand-green text-black font-bold py-3 px-8 rounded-lg text-base disabled:opacity-50"
        >
          {status === "recording" && "Stop Recording"}
          {status === "idle" && "Record"}
          {status === "preparing" && "Preparing..."}
          {status === "stopping" && "Stopping..."}
        </button>
      </footer>
    </div>
  );
}
