import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  systemPreferences,
  dialog,
  screen,
  IpcMainInvokeEvent,
  IpcMainEvent,
} from "electron";
import path from "node:path";
import squirrel from "electron-squirrel-startup";
import fs from "node:fs";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrel) {
  app.quit();
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

ipcMain.handle(
  "get-sources",
  async (_event: IpcMainInvokeEvent, types: ("window" | "screen")[]) => {
    const sources = await desktopCapturer.getSources({
      types,
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailURL: source.thumbnail.toDataURL(),
    }));
  }
);

ipcMain.handle(
  "save-recording",
  async (_event: IpcMainInvokeEvent, buffer: Buffer) => {
    const { filePath } = await dialog.showSaveDialog({
      buttonLabel: "Save video",
      defaultPath: `captrix-recording-${Date.now()}.webm`,
    });

    if (filePath) {
      fs.writeFile(filePath, buffer, () =>
        console.log("video saved successfully!")
      );
    }
  }
);

ipcMain.handle("select-area", () => {
  return new Promise((resolve) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    const selectionWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width,
      height,
      transparent: true,
      frame: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    const cleanup = () => {
      ipcMain.removeListener("area-selected", onAreaSelected);
      ipcMain.removeListener("area-selection-cancelled", onCancel);
      if (!selectionWindow.isDestroyed()) {
        selectionWindow.close();
      }
    };

    const onAreaSelected = (_event: IpcMainEvent, rect: SelectionRect) => {
      cleanup();
      const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
      resolve({ rect, scaleFactor });
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    ipcMain.once("area-selected", onAreaSelected);
    ipcMain.once("area-selection-cancelled", onCancel);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      selectionWindow.loadURL(
        `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/selection.html`
      );
    } else {
      selectionWindow.loadFile(
        path.join(__dirname, `../renderer/main_window/selection.html`)
      );
    }
  });
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
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
app.whenReady().then(async () => {
  createWindow();
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
