import React from "react";

interface EditorProps {
  videoBlob: Blob;
  onExit: () => void;
}

export default function Editor({ videoBlob, onExit }: EditorProps) {
  const videoUrl = React.useMemo(() => {
    if (videoBlob) {
      return URL.createObjectURL(videoBlob);
    }
    return "";
  }, [videoBlob]);

  return (
    <div className="bg-[#111312] text-white min-h-screen font-sans flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-gray-800/50">
        <h1 className="text-lg font-bold">Editor</h1>
        <button onClick={onExit} className="text-gray-400 hover:text-white">
          Back to Home
        </button>
      </header>
      <main className="flex-grow p-12 flex justify-center items-center">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-[70vh] rounded-lg"
          />
        ) : (
          <p>No video to display.</p>
        )}
      </main>
      <footer className="p-6 flex justify-end border-t border-gray-800/50">
        <button className="bg-brand-green text-black font-bold py-3 px-8 rounded-lg text-base">
          Export
        </button>
      </footer>
    </div>
  );
}
