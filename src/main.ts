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

const sendKeydown = () => {
  console.log("Keyboard activity detected in main process.");
  if (mainWindow) {
    mainWindow.webContents.send("keyboard-activity");
  }
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
