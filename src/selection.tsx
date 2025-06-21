import React, { useState, useRef, useEffect, useCallback } from "react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Action {
  type: "none" | "move" | "resize";
  handle: string | null;
  startX: number;
  startY: number;
  startRect: Rect;
}

const ResizeHandle = ({
  handle,
  onMouseDown,
}: {
  handle: string;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, handle: string) => void;
}) => (
  <div
    className={`absolute w-3 h-3 bg-brand-green border border-white -m-1.5 z-20 ${
      handle.includes("n") ? "top-0 " : ""
    } ${handle.includes("s") ? "bottom-0 " : ""} ${
      handle.includes("w") ? "left-0 " : ""
    } ${handle.includes("e") ? "right-0 " : ""} ${
      !handle.includes("n") && !handle.includes("s")
        ? "top-1/2 -translate-y-1/2 "
        : ""
    } ${
      !handle.includes("w") && !handle.includes("e")
        ? "left-1/2 -translate-x-1/2 "
        : ""
    }`}
    style={{ cursor: `${handle}-resize` }}
    onMouseDown={(e) => onMouseDown(e, handle)}
  />
);

export default function Selection() {
  const [rect, setRect] = useState<Rect>({
    x: window.innerWidth / 2 - 320,
    y: window.innerHeight / 2 - 180,
    width: 640,
    height: 360,
  });

  const actionRef = useRef<Action>({
    type: "none",
    handle: null,
    startX: 0,
    startY: 0,
    startRect: { ...rect },
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, handle?: string) => {
      e.stopPropagation();
      const currentAction = actionRef.current;
      currentAction.type = handle ? "resize" : "move";
      currentAction.handle = handle || null;
      currentAction.startX = e.clientX;
      currentAction.startY = e.clientY;
      currentAction.startRect = { ...rect };
    },
    [rect]
  );

  const sendSelection = useCallback(() => {
    const finalRect = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    if (finalRect.width > 0 && finalRect.height > 0) {
      window.electronAPI.send("area-selected", finalRect);
    } else {
      window.electronAPI.send("area-selection-cancelled");
    }
  }, [rect]);

  const cancelSelection = () => {
    window.electronAPI.send("area-selection-cancelled");
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { type, startX, startY, startRect, handle } = actionRef.current;
      if (type === "none") return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newRect = { ...startRect };

      if (type === "move") {
        newRect.x = startRect.x + dx;
        newRect.y = startRect.y + dy;
      } else if (type === "resize" && handle) {
        if (handle.includes("e"))
          newRect.width = Math.max(50, startRect.width + dx);
        if (handle.includes("w")) {
          newRect.width = Math.max(50, startRect.width - dx);
          newRect.x = startRect.x + dx;
        }
        if (handle.includes("s"))
          newRect.height = Math.max(50, startRect.height + dy);
        if (handle.includes("n")) {
          newRect.height = Math.max(50, startRect.height - dy);
          newRect.y = startRect.y + dy;
        }
      }
      setRect(newRect);
    };

    const handleMouseUp = () => {
      actionRef.current.type = "none";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelSelection();
      if (e.key === "Enter") sendSelection();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sendSelection]);

  const handles = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

  return (
    <div className="w-screen h-screen cursor-default select-none">
      <div
        className="absolute border-2 border-brand-green bg-black/10 cursor-move"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onMouseDown={handleMouseDown}
      >
        {handles.map((handle) => (
          <ResizeHandle
            key={handle}
            handle={handle}
            onMouseDown={handleMouseDown}
          />
        ))}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[120%] flex gap-3 p-3 bg-gray-900/80 rounded-lg cursor-default"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={sendSelection}
            className="px-5 py-2 text-sm font-bold text-black rounded-md bg-brand-green"
          >
            Record
          </button>
          <button
            onClick={cancelSelection}
            className="px-5 py-2 text-sm text-white bg-gray-600/80 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
