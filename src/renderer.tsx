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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioSources, setAudioSources] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioSourceId, setSelectedAudioSourceId] = useState<
    string | null
  >(null);

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
    const getAudioSources = async () => {
      try {
        // Request dummy audio stream to get permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setAudioSources(audioInputDevices);
        if (audioInputDevices.length > 0) {
          setSelectedAudioSourceId(audioInputDevices[0].deviceId);
        }
        // Stop dummy stream
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Could not get audio devices or permissions.", error);
        setAudioSources([]);
      }
    };

    getAudioSources();
  }, []);

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

    const videoTracks = videoStream.getTracks().map((track) => track.clone());
    const audioTracks = audioStream ? audioStream.getTracks() : [];

    const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

    mediaRecorder.current = new MediaRecorder(combinedStream, {
      mimeType: "video/webm; codecs=vp9,opus",
    });
    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };
    mediaRecorder.current.onstop = () => {
      combinedStream.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;

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
  };

  return (
    <div className="recorder">
      <div className="preview">
        <video ref={videoRef} autoPlay muted={recordingState !== "recorded"} />
      </div>
      {recordingState === "idle" && (
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
