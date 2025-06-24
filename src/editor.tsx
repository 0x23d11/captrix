import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";

interface EditorProps {
  videoBlob: Blob;
  onExit: () => void;
}

type AspectRatio = "source" | "16:9" | "9:16";

const OptionButton = ({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 focus:outline-none flex-grow ${
      selected
        ? "border-green-400 bg-green-900/50 text-green-300 shadow-md"
        : "border-gray-600 bg-gray-800/80 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
    }`}
  >
    {children}
  </button>
);

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
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("source");

  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (backgroundImage) {
      const url = URL.createObjectURL(backgroundImage);
      setBackgroundImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBackgroundImageUrl("");
  }, [backgroundImage]);

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

    let bgImage: HTMLImageElement | null = null;
    if (backgroundImage) {
      bgImage = document.createElement("img");
      bgImage.src = URL.createObjectURL(backgroundImage);
      await new Promise((resolve) => (bgImage.onload = resolve));
    }

    await new Promise((resolve) => {
      videoEl.onloadedmetadata = resolve;
    });

    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;

    let targetWidth, targetHeight;

    if (aspectRatio === "16:9") {
      targetWidth = 1920;
      targetHeight = 1080;
    } else if (aspectRatio === "9:16") {
      targetWidth = 1080;
      targetHeight = 1920;
    } else {
      // 'source'
      targetWidth = videoWidth;
      targetHeight = videoHeight;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth + padding * 2;
    canvas.height = targetHeight + padding * 2;
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

    // Calculate source video crop for "cover" effect
    const videoRatio = videoWidth / videoHeight;
    const targetRatio = targetWidth / targetHeight;
    let sx = 0,
      sy = 0,
      sWidth = videoWidth,
      sHeight = videoHeight;

    if (videoRatio > targetRatio) {
      // Video is wider than target, crop x-axis
      sWidth = videoHeight * targetRatio;
      sx = (videoWidth - sWidth) / 2;
    } else {
      // Video is taller than target, crop y-axis
      sHeight = videoWidth / targetRatio;
      sy = (videoHeight - sHeight) / 2;
    }

    const renderFrame = () => {
      if (videoEl.paused || videoEl.ended) {
        recorder.stop();
        return;
      }

      if (bgImage) {
        const canvasRatio = canvas.width / canvas.height;
        const imageRatio = bgImage.width / bgImage.height;
        let img_sx = 0,
          img_sy = 0,
          img_sWidth = bgImage.width,
          img_sHeight = bgImage.height;

        if (imageRatio > canvasRatio) {
          img_sWidth = bgImage.height * canvasRatio;
          img_sx = (bgImage.width - img_sWidth) / 2;
        } else {
          img_sHeight = bgImage.width / canvasRatio;
          img_sy = (bgImage.height - img_sHeight) / 2;
        }
        ctx.drawImage(
          bgImage,
          img_sx,
          img_sy,
          img_sWidth,
          img_sHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.beginPath();
      const br = Math.min(borderRadius, targetWidth / 2, targetHeight / 2);
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

      ctx.drawImage(
        videoEl,
        sx,
        sy,
        sWidth,
        sHeight,
        padding,
        padding,
        targetWidth,
        targetHeight
      );
      ctx.restore();

      requestAnimationFrame(renderFrame);
    };

    videoEl.play();
    requestAnimationFrame(renderFrame);
  }, [
    videoBlob,
    padding,
    borderRadius,
    backgroundColor,
    aspectRatio,
    backgroundImage,
  ]);

  return (
    <div className="bg-[#111312] text-white min-h-screen font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-80 bg-[#1a1c1b] p-6 border-r border-gray-800/50 flex-shrink-0 flex flex-col">
        <h2 className="text-xl font-bold mb-6">Styling</h2>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Aspect Ratio</label>
            <div className="flex items-center gap-2">
              <OptionButton
                selected={aspectRatio === "source"}
                onClick={() => setAspectRatio("source")}
              >
                Source
              </OptionButton>
              <OptionButton
                selected={aspectRatio === "16:9"}
                onClick={() => setAspectRatio("16:9")}
              >
                16:9
              </OptionButton>
              <OptionButton
                selected={aspectRatio === "9:16"}
                onClick={() => setAspectRatio("9:16")}
              >
                9:16
              </OptionButton>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  setBackgroundImage(null);
                }}
                className="w-12 h-10 p-1 bg-gray-700 border border-gray-600 rounded-md shrink-0"
              />
              <input
                type="file"
                ref={backgroundInputRef}
                hidden
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setBackgroundImage(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="flex-grow text-center text-xs py-2 px-2 border border-gray-600 rounded-md hover:bg-gray-700 truncate"
              >
                {backgroundImage ? backgroundImage.name : "Choose Image"}
              </button>
              {backgroundImage && (
                <button
                  onClick={() => setBackgroundImage(null)}
                  className="text-red-500 hover:text-red-400 text-lg shrink-0"
                >
                  &times;
                </button>
              )}
            </div>
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
        style={{
          backgroundColor: backgroundColor,
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className={`transition-all duration-200 ${shadowClasses[shadow]} max-w-[80vw] max-h-[80vh] flex items-center justify-center`}
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
              className="block h-full"
              style={{
                borderRadius: `${borderRadius}px`,
                aspectRatio:
                  aspectRatio === "source"
                    ? "auto"
                    : aspectRatio === "16:9"
                    ? "16 / 9"
                    : "9 / 16",
                objectFit: "cover",
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
