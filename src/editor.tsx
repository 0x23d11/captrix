import React, { useState, useMemo, useCallback } from "react";

interface EditorProps {
  videoBlob: Blob;
  onExit: () => void;
}

const SettingSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm text-gray-400">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full"
      />
      <span className="text-sm w-12 text-center">{value}px</span>
    </div>
  </div>
);

export default function Editor({ videoBlob, onExit }: EditorProps) {
  const videoUrl = useMemo(() => {
    if (videoBlob) {
      return URL.createObjectURL(videoBlob);
    }
    return "";
  }, [videoBlob]);

  const [padding, setPadding] = useState(60);
  const [borderRadius, setBorderRadius] = useState(20);
  const [shadow, setShadow] = useState(3);
  const [backgroundColor, setBackgroundColor] = useState("#99f695");
  const [isExporting, setIsExporting] = useState(false);

  const shadowClasses: { [key: number]: string } = {
    1: "shadow-none",
    2: "shadow-md",
    3: "shadow-lg",
    4: "shadow-xl",
    5: "shadow-2xl",
  };

  const handleExport = useCallback(async () => {
    if (!videoBlob) return;
    setIsExporting(true);

    const videoEl = document.createElement("video");
    videoEl.src = URL.createObjectURL(videoBlob);
    videoEl.muted = true;

    await new Promise((resolve) => {
      videoEl.onloadedmetadata = resolve;
    });

    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth + padding * 2;
    canvas.height = videoHeight + padding * 2;
    const ctx = canvas.getContext("2d");

    // Get the video track from the canvas
    const videoStream = canvas.captureStream(30);
    const [videoTrack] = videoStream.getVideoTracks();

    // Get the audio track from the original video
    // Note: captureStream() is experimental and might not be on all browsers,
    // but it's well-supported in modern environments like Electron.
    const sourceStream = (videoEl as any).captureStream() as MediaStream;
    const [audioTrack] = sourceStream.getAudioTracks();

    // Combine the new video track with the original audio track
    const combinedStream = new MediaStream([videoTrack]);
    if (audioTrack) {
      combinedStream.addTrack(audioTrack);
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm; codecs=vp9",
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const finalBlob = new Blob(chunks, { type: "video/webm" });
      const buffer = new Uint8Array(await finalBlob.arrayBuffer());
      window.electronAPI.saveRecording(buffer);
      setIsExporting(false);
      URL.revokeObjectURL(videoEl.src);
    };

    recorder.start();

    const renderFrame = () => {
      if (videoEl.paused || videoEl.ended) {
        recorder.stop();
        return;
      }

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.beginPath();
      const br = Math.min(borderRadius, videoWidth / 2, videoHeight / 2);
      ctx.moveTo(padding + br, padding);
      ctx.lineTo(canvas.width - padding - br, padding);
      ctx.quadraticCurveTo(
        canvas.width - padding,
        padding,
        canvas.width - padding,
        padding + br
      );
      ctx.lineTo(canvas.width - padding, canvas.height - padding - br);
      ctx.quadraticCurveTo(
        canvas.width - padding,
        canvas.height - padding,
        canvas.width - padding - br,
        canvas.height - padding
      );
      ctx.lineTo(padding + br, canvas.height - padding);
      ctx.quadraticCurveTo(
        padding,
        canvas.height - padding,
        padding,
        canvas.height - padding - br
      );
      ctx.lineTo(padding, padding + br);
      ctx.quadraticCurveTo(padding, padding, padding + br, padding);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(videoEl, padding, padding, videoWidth, videoHeight);
      ctx.restore();

      requestAnimationFrame(renderFrame);
    };

    videoEl.play();
    requestAnimationFrame(renderFrame);
  }, [videoBlob, padding, borderRadius, backgroundColor]);

  return (
    <div className="bg-[#111312] text-white min-h-screen font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-80 bg-[#1a1c1b] p-6 border-r border-gray-800/50 flex-shrink-0 flex flex-col">
        <h2 className="text-xl font-bold mb-6">Styling</h2>

        <div className="flex flex-col gap-6">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Background Color
            </label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md"
            />
          </div>

          <SettingSlider
            label="Padding"
            value={padding}
            onChange={(e) => setPadding(Number(e.target.value))}
            min={0}
            max={200}
            step={1}
          />

          <SettingSlider
            label="Rounded Corners"
            value={borderRadius}
            onChange={(e) => setBorderRadius(Number(e.target.value))}
            min={0}
            max={50}
            step={1}
          />

          <SettingSlider
            label="Shadow"
            value={shadow}
            onChange={(e) => setShadow(Number(e.target.value))}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-brand-green text-black font-bold py-3 px-8 rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
          <button
            onClick={onExit}
            className="w-full text-center mt-4 text-gray-400 hover:text-white"
          >
            Back to Home
          </button>
        </div>
      </aside>

      <main
        className="flex-grow flex justify-center items-center p-4 md:p-12 overflow-hidden"
        style={{ backgroundColor: backgroundColor }}
      >
        <div
          className={`transition-all duration-200 ${shadowClasses[shadow]}`}
          style={{
            padding: `${padding}px`,
          }}
        >
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              autoPlay
              loop
              className="max-w-full max-h-[70vh] block"
              style={{
                borderRadius: `${borderRadius}px`,
              }}
            />
          ) : (
            <p>No video to display.</p>
          )}
        </div>
      </main>
    </div>
  );
}
