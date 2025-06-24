import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "./home";
import Editor from "./editor";

document.body.className = "h-full";
document.documentElement.className = "h-full";

type View = "home" | "editor";

const App = () => {
  const [view, setView] = useState<View>("home");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const handleRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
    setView("editor");
  };

  const handleExitEditor = () => {
    setVideoBlob(null);
    setView("home");
  };

  if (view === "editor" && videoBlob) {
    return <Editor videoBlob={videoBlob} onExit={handleExitEditor} />;
  }

  return <Home onRecordingComplete={handleRecordingComplete} />;
};

const root = createRoot(document.getElementById("root"));
root.render(<App />);
