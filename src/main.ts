import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
  screen,
  globalShortcut,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import started from "electron-squirrel-startup";
import { uIOhook } from "uiohook-napi";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null;

const sendMouseClick = (event: { x: number; y: number }) => {
  if (mainWindow) {
    mainWindow.webContents.send("mouse-click", { x: event.x, y: event.y });
  }
};

const sendMouseMove = (event: { x: number; y: number }) => {
  if (mainWindow) {
    mainWindow.webContents.send("mouse-move", { x: event.x, y: event.y });
  }
};

const sendKeydown = (event: any) => {
  // Filter out key combinations that shouldn't trigger zoom
  const { ctrlKey, metaKey, altKey, shiftKey, keycode } = event;

  // Ignore global shortcuts and system-level key combinations
  const isModifierCombo = ctrlKey || metaKey || altKey;
  const isGlobalShortcut =
    (ctrlKey || metaKey) && shiftKey && (keycode === 82 || keycode === 80); // R or P
  const isFunctionKey = keycode >= 112 && keycode <= 123; // F1-F12
  const isSystemKey = keycode === 91 || keycode === 92 || keycode === 93; // Windows/Cmd keys

  // Only trigger zoom for regular typing and navigation keys
  if (
    isGlobalShortcut ||
    isFunctionKey ||
    isSystemKey ||
    (isModifierCombo && !isRegularKey(keycode))
  ) {
    console.log("Ignoring system/shortcut key for zoom:", keycode, {
      ctrlKey,
      metaKey,
      altKey,
      shiftKey,
    });
    return;
  }

  console.log("Keyboard activity detected for zoom:", keycode);
  if (mainWindow) {
    mainWindow.webContents.send("keyboard-activity");
  }
};

// Helper function to determine if a key with modifiers is still a "regular" typing key
const isRegularKey = (keycode: number): boolean => {
  // Letters (A-Z)
  if (keycode >= 65 && keycode <= 90) return true;
  // Numbers (0-9)
  if (keycode >= 48 && keycode <= 57) return true;
  // Numpad numbers
  if (keycode >= 96 && keycode <= 105) return true;
  // Space, Enter, Backspace, Delete, Tab
  if ([32, 13, 8, 46, 9].includes(keycode)) return true;
  // Arrow keys
  if (keycode >= 37 && keycode <= 40) return true;
  // Home, End, Page Up, Page Down
  if ([35, 36, 33, 34].includes(keycode)) return true;

  return false;
};

ipcMain.on("start-mouse-event-tracking", () => {
  uIOhook.on("mousedown", sendMouseClick);
  uIOhook.on("mousemove", sendMouseMove);
  uIOhook.on("keydown", sendKeydown);
  uIOhook.start();
});

ipcMain.on("stop-mouse-event-tracking", () => {
  uIOhook.off("mousedown", sendMouseClick);
  uIOhook.off("mousemove", sendMouseMove);
  uIOhook.off("keydown", sendKeydown);
  // It's safer to not stop uiohook here, as it's a shared resource.
  // We will stop it on app quit.
});

ipcMain.handle("get-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });
  return sources.map((source) => {
    return {
      id: source.id,
      name: source.name,
      thumbnailURL: source.thumbnail.toDataURL(),
    };
  });
});

ipcMain.handle("get-displays", async () => {
  return screen.getAllDisplays();
});

ipcMain.handle("save-video", async (_, buffer: ArrayBuffer) => {
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "Save video",
    defaultPath: `recording-${Date.now()}.webm`,
  });

  if (filePath) {
    await fs.writeFile(filePath, new Uint8Array(buffer));
    return filePath;
  }
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (mainWindow) {
      mainWindow.webContents.send("global-shortcut-triggered");
    }
  });

  globalShortcut.register("CommandOrControl+Shift+P", () => {
    if (mainWindow) {
      mainWindow.webContents.send("global-shortcut-pause-resume-triggered");
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  uIOhook.stop();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
