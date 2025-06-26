import React, { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type EditorProps = {
  videoUrl: string;
  onBack: () => void;
};

const Editor = ({ videoUrl, onBack }: EditorProps) => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:00");
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadFfmpeg = async () => {
    try {
      const ffmpegInstance = new FFmpeg();
      ffmpegInstance.on("log", ({ message }) => {
        console.log(message);
      });
      ffmpegInstance.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      const baseURL = "/"; // from the public directory

      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFfmpeg();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        const duration = videoRef.current?.duration ?? 0;
        const hours = Math.floor(duration / 3600)
          .toString()
          .padStart(2, "0");
        const minutes = Math.floor((duration % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const seconds = Math.floor(duration % 60)
          .toString()
          .padStart(2, "0");
        setEndTime(`${hours}:${minutes}:${seconds}`);
      };
    }
  }, [editedVideoUrl, videoUrl]);

  const handleTrim = async () => {
    if (!ffmpeg || !videoUrl) return;

    setProgress(0);
    const inputFileName = "input.webm";
    const outputFileName = "output.mp4";

    await ffmpeg.writeFile(inputFileName, await fetchFile(finalVideoUrl));

    await ffmpeg.exec([
      "-i",
      inputFileName,
      "-ss",
      startTime,
      "-to",
      endTime,
      outputFileName,
    ]);

    const data = await ffmpeg.readFile(outputFileName);
    const newBlob = new Blob([data], { type: "video/mp4" });
    const newUrl = URL.createObjectURL(newBlob);
    setEditedVideoUrl(newUrl);
    setProgress(0);
  };

  const finalVideoUrl = editedVideoUrl || videoUrl;

  return (
    <div className="editor">
      <div className="editor-top-bar">
        <button onClick={onBack}>Back to Recorder</button>
        <h2>Video Editor</h2>
        <button>Export</button>
      </div>
      <div className="editor-main">
        <div className="editor-preview">
          {isLoading ? (
            <p>Loading Editor...</p>
          ) : (
            <video ref={videoRef} src={finalVideoUrl} controls />
          )}
        </div>
        <div className="editor-sidebar">
          <h3>Edit Tools</h3>
          {isLoading ? (
            <p>FFmpeg loading...</p>
          ) : (
            <div>
              <h4>Trim</h4>
              <div className="trim-inputs">
                <label>
                  Start Time
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label>
                  End Time
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
              </div>
              <button onClick={handleTrim}>Trim Video</button>
              {progress > 0 && <p>Progress: {progress}%</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
