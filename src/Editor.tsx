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
} from "react-icons/fa";

type EditorProps = {
  videoUrl: string;
  onBack: () => void;
};

const Editor = ({ videoUrl, onBack }: EditorProps) => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:00");
  const [isDurationSet, setIsDurationSet] = useState(false);

  useEffect(() => {
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
  }, [editedVideoUrl, videoUrl]);

  const handleLoadedData = () => {
    if (videoRef.current && !isDurationSet) {
      const video = videoRef.current;
      const videoDuration = video.duration;
      if (isFinite(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
        const hours = Math.floor(videoDuration / 3600)
          .toString()
          .padStart(2, "0");
        const minutes = Math.floor((videoDuration % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const seconds = Math.floor(videoDuration % 60)
          .toString()
          .padStart(2, "0");
        setEndTime(`${hours}:${minutes}:${seconds}`);
        setIsDurationSet(true);
      }
    }
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

  const handleTrim = async () => {
    if (!ffmpeg) {
      console.error("FFmpeg not loaded yet");
      return;
    }

    const inputFileName = "input.webm";
    const outputFileName = "output.mp4";
    await ffmpeg.writeFile(
      inputFileName,
      new Uint8Array(await (await fetch(videoUrl)).arrayBuffer())
    );

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
        <div className="flex-none">
          <button className="btn btn-primary" onClick={handleTrim}>
            <FaSave className="mr-2" />
            Trim & Save
          </button>
        </div>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <video
            ref={videoRef}
            src={editedVideoUrl ?? videoUrl}
            className="w-full rounded-lg shadow-2xl"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() =>
              videoRef.current && setCurrentTime(videoRef.current.currentTime)
            }
            onLoadedData={handleLoadedData}
          />
          <div className="p-4 bg-base-200 rounded-b-lg">
            <div className="flex justify-center items-center gap-4">
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime -= 5;
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
                  if (videoRef.current) videoRef.current.currentTime += 5;
                }}
              >
                <FaForward size="1.5em" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-base-200 rounded-lg w-full max-w-4xl">
          <h3 className="text-lg font-bold mb-2">Trimming</h3>
          <div className="flex items-center gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Time</span>
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">End Time</span>
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </div>
      </div>
      {progress > 0 && progress < 100 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Processing...</h2>
              <progress
                className="progress progress-primary w-full"
                value={progress}
                max="100"
              ></progress>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
