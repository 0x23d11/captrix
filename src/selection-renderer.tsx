import React from "react";
import { createRoot } from "react-dom/client";
import Selection from "./selection.tsx";
import "./index.css"; // For Tailwind support

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Selection />
    </React.StrictMode>
  );
}
