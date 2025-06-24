import React, { useState } from "react";

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
  const videoUrl = React.useMemo(() => {
    if (videoBlob) {
      return URL.createObjectURL(videoBlob);
    }
    return "";
  }, [videoBlob]);

  const [padding, setPadding] = useState(60);
  const [borderRadius, setBorderRadius] = useState(20);
  const [shadow, setShadow] = useState(3);
  const [backgroundColor, setBackgroundColor] = useState("#99f695");

  const shadowClasses: { [key: number]: string } = {
    1: "shadow-none",
    2: "shadow-md",
    3: "shadow-lg",
    4: "shadow-xl",
    5: "shadow-2xl",
  };

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
          <button className="w-full bg-brand-green text-black font-bold py-3 px-8 rounded-lg text-base">
            Export
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
