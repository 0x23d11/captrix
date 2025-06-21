// This script runs in the selection window.

const selectionBox = document.getElementById("selection-box") as HTMLDivElement;
const controls = document.getElementById("controls") as HTMLDivElement;
const recordBtn = document.getElementById("record-btn");
const cancelBtn = document.getElementById("cancel-btn");

// Initial position and size
let rect = {
  x: window.innerWidth / 2 - 250,
  y: window.innerHeight / 2 - 150,
  width: 500,
  height: 300,
};

function updateSelectionBox() {
  selectionBox.style.left = `${rect.x}px`;
  selectionBox.style.top = `${rect.y}px`;
  selectionBox.style.width = `${rect.width}px`;
  selectionBox.style.height = `${rect.height}px`;
}

updateSelectionBox(); // Set initial position

let action = {
  type: "none", // 'move', 'resize'
  handle: null, // 'nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'
  startX: 0,
  startY: 0,
  startRect: { ...rect },
};

selectionBox.addEventListener("mousedown", (e) => {
  // Check if a resize handle was clicked
  const target = e.target as HTMLElement;
  if (target.classList.contains("resize-handle")) {
    action.type = "resize";
    action.handle = target.dataset.handle;
  } else if (
    target.id === "controls" ||
    target.classList.contains("control-button")
  ) {
    // Prevent moving when interacting with controls
    action.type = "none";
    return;
  } else {
    // Otherwise, it's a move action
    action.type = "move";
  }

  action.startX = e.clientX;
  action.startY = e.clientY;
  action.startRect = { ...rect }; // Store rect state at the start of the action
  e.stopPropagation();
});

window.addEventListener("mousemove", (e) => {
  if (action.type === "none") return;

  const dx = e.clientX - action.startX;
  const dy = e.clientY - action.startY;

  if (action.type === "move") {
    rect.x = action.startRect.x + dx;
    rect.y = action.startRect.y + dy;
  } else if (action.type === "resize") {
    const handle = action.handle;
    let newX = action.startRect.x;
    let newY = action.startRect.y;
    let newWidth = action.startRect.width;
    let newHeight = action.startRect.height;

    // Horizontal adjustments
    if (handle.includes("e")) {
      newWidth = action.startRect.width + dx;
    } else if (handle.includes("w")) {
      newWidth = action.startRect.width - dx;
      newX = action.startRect.x + dx;
    }

    // Vertical adjustments
    if (handle.includes("s")) {
      newHeight = action.startRect.height + dy;
    } else if (handle.includes("n")) {
      newHeight = action.startRect.height - dy;
      newY = action.startRect.y + dy;
    }

    // Ensure minimum size
    rect.x = newX;
    rect.y = newY;
    rect.width = Math.max(newWidth, 50);
    rect.height = Math.max(newHeight, 50);
  }

  updateSelectionBox();
});

window.addEventListener("mouseup", () => {
  action.type = "none";
});

function sendSelection() {
  // Ensure integers and positive dimensions
  const finalRect = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  if (finalRect.width > 0 && finalRect.height > 0) {
    // @ts-ignore
    window.electronAPI.send("area-selected", finalRect);
  } else {
    cancelSelection();
  }
}

function cancelSelection() {
  // @ts-ignore
  window.electronAPI.send("area-selection-cancelled");
}

recordBtn.addEventListener("click", sendSelection);
cancelBtn.addEventListener("click", cancelSelection);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cancelSelection();
  }
  if (e.key === "Enter") {
    e.preventDefault(); // Prevent default browser action for Enter
    sendSelection();
  }
});
