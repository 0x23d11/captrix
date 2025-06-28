import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
  screen,
  globalShortcut,
  session,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import started from "electron-squirrel-startup";
import { uIOhook } from "uiohook-napi";
import { autoUpdater } from "electron-updater";
import * as os from "os";
import { exec } from "child_process";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null;

// Auto-updater configuration
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.autoDownload = false; // We'll ask user first
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater event handlers
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
  if (mainWindow) {
    mainWindow.webContents.send("updater-checking");
  }
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available.", info);
  if (mainWindow) {
    mainWindow.webContents.send("updater-update-available", info);
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available.", info);
  if (mainWindow) {
    mainWindow.webContents.send("updater-update-not-available", info);
  }
});

autoUpdater.on("error", (err) => {
  console.log("Error in auto-updater. " + err);
  if (mainWindow) {
    mainWindow.webContents.send("updater-error", err.message);
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  console.log(log_message);
  if (mainWindow) {
    mainWindow.webContents.send("updater-download-progress", progressObj);
  }
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded");
  if (mainWindow) {
    mainWindow.webContents.send("updater-update-downloaded", info);
  }
});

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
  try {
    uIOhook.on("mousedown", sendMouseClick);
    uIOhook.on("mousemove", sendMouseMove);
    uIOhook.on("keydown", sendKeydown);
    uIOhook.start();
    console.log("Mouse tracking started successfully");
  } catch (error) {
    console.error("Failed to start mouse tracking:", error);
    console.log(
      "Note: On macOS, you may need to grant Accessibility permissions to this app in System Preferences > Privacy & Security > Accessibility"
    );
    // Send error to renderer so it can show a user-friendly message
    if (mainWindow) {
      mainWindow.webContents.send("mouse-tracking-error", error.message);
    }
  }
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

// Auto-updater IPC handlers
ipcMain.handle("check-for-updates", async () => {
  return await autoUpdater.checkForUpdates();
});

ipcMain.handle("download-update", async () => {
  return await autoUpdater.downloadUpdate();
});

ipcMain.handle("quit-and-install", () => {
  autoUpdater.quitAndInstall();
});

// Permission checking function
const checkMouseTrackingPermissions = (): Promise<{
  hasPermission: boolean;
  needsPermission: boolean;
  platform: string;
}> => {
  return new Promise((resolve) => {
    const platform = os.platform();

    if (platform === "darwin") {
      // macOS requires Accessibility permissions
      try {
        // Test if we can start uIOhook without crashing
        const testHook = () => {
          try {
            uIOhook.start();
            uIOhook.stop();
            resolve({
              hasPermission: true,
              needsPermission: true,
              platform: "macOS",
            });
          } catch (error) {
            console.log("macOS Accessibility permission needed:", error);
            resolve({
              hasPermission: false,
              needsPermission: true,
              platform: "macOS",
            });
          }
        };

        // Use a timeout to catch hanging
        const timeout = setTimeout(() => {
          resolve({
            hasPermission: false,
            needsPermission: true,
            platform: "macOS",
          });
        }, 2000);

        testHook();
        clearTimeout(timeout);
      } catch (error) {
        resolve({
          hasPermission: false,
          needsPermission: true,
          platform: "macOS",
        });
      }
    } else if (platform === "win32") {
      // Windows typically doesn't need special permissions for uIOhook
      resolve({
        hasPermission: true,
        needsPermission: false,
        platform: "Windows",
      });
    } else {
      // Linux - may need permissions in some cases
      resolve({
        hasPermission: true,
        needsPermission: true,
        platform: "Linux",
      });
    }
  });
};

ipcMain.handle("check-mouse-tracking-permissions", async () => {
  return await checkMouseTrackingPermissions();
});

ipcMain.handle("open-system-preferences", () => {
  const platform = os.platform();
  if (platform === "darwin") {
    // Open macOS System Preferences to Accessibility
    exec(
      'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"'
    );
  } else if (platform === "win32") {
    // Windows doesn't typically need this, but we could open relevant settings
    exec("start ms-settings:privacy-general");
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
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

  // Open the DevTools only in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// Set up media permissions handler
const setupMediaPermissions = () => {
  try {
    // Handle permission requests for media devices
    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        console.log(`Permission request for: ${permission}`);

        // Always allow media permissions for our app
        if (permission === "media") {
          console.log(`Granting ${permission} permission`);
          callback(true);
          return;
        }

        // For other permissions, use default behavior
        callback(false);
      }
    );

    // Handle permission check requests
    session.defaultSession.setPermissionCheckHandler(
      (webContents, permission, requestingOrigin, details) => {
        console.log(
          `Permission check for: ${permission} from ${requestingOrigin}`
        );

        // Always allow media permissions for our app
        if (permission === "media") {
          console.log(`Permission check: allowing ${permission}`);
          return true;
        }

        return false;
      }
    );

    // Set device permission handler for better control
    session.defaultSession.setDevicePermissionHandler((details) => {
      console.log("Device permission request:", details);

      // Allow all device permissions for our app - this helps with USB devices and other hardware
      return true;
    });

    console.log("Media permissions setup completed successfully");
  } catch (error) {
    console.warn(
      "Failed to setup media permissions (this may be normal for unsigned apps):",
      error
    );
    // Don't throw - the app should still work for basic functionality
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Set up media permissions before creating window
  setupMediaPermissions();

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

  // Check for updates after app is ready (only in production)
  if (!app.isPackaged) {
    console.log("Development mode - skipping auto-updater");
  } else {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000); // Check after 5 seconds to allow app to fully load
  }
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
