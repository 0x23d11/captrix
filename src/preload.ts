// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  saveVideo: (buffer: ArrayBuffer) => ipcRenderer.invoke("save-video", buffer),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  startMouseEventTracking: () => ipcRenderer.send("start-mouse-event-tracking"),
  stopMouseEventTracking: () => ipcRenderer.send("stop-mouse-event-tracking"),

  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  onMouseClick: (callback: (position: { x: number; y: number }) => void) => {
    const listener = (_event: unknown, position: { x: number; y: number }) =>
      callback(position);
    ipcRenderer.on("mouse-click", listener);
    return () => {
      ipcRenderer.removeListener("mouse-click", listener);
    };
  },
  onMouseMove: (callback: (position: { x: number; y: number }) => void) => {
    const listener = (_event: unknown, position: { x: number; y: number }) =>
      callback(position);
    ipcRenderer.on("mouse-move", listener);
    return () => {
      ipcRenderer.removeListener("mouse-move", listener);
    };
  },
  onKeyboardActivity: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("keyboard-activity", listener);
    return () => {
      ipcRenderer.removeListener("keyboard-activity", listener);
    };
  },
  onGlobalShortcut: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("global-shortcut-triggered", listener);
    return () => {
      ipcRenderer.removeListener("global-shortcut-triggered", listener);
    };
  },
  onGlobalShortcutPauseResume: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("global-shortcut-pause-resume-triggered", listener);
    return () => {
      ipcRenderer.removeListener(
        "global-shortcut-pause-resume-triggered",
        listener
      );
    };
  },

  // Auto-updater event listeners
  onUpdaterChecking: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("updater-checking", listener);
    return () => {
      ipcRenderer.removeListener("updater-checking", listener);
    };
  },
  onUpdaterUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_event: unknown, info: any) => callback(info);
    ipcRenderer.on("updater-update-available", listener);
    return () => {
      ipcRenderer.removeListener("updater-update-available", listener);
    };
  },
  onUpdaterUpdateNotAvailable: (callback: (info: any) => void) => {
    const listener = (_event: unknown, info: any) => callback(info);
    ipcRenderer.on("updater-update-not-available", listener);
    return () => {
      ipcRenderer.removeListener("updater-update-not-available", listener);
    };
  },
  onUpdaterError: (callback: (error: string) => void) => {
    const listener = (_event: unknown, error: string) => callback(error);
    ipcRenderer.on("updater-error", listener);
    return () => {
      ipcRenderer.removeListener("updater-error", listener);
    };
  },
  onUpdaterDownloadProgress: (callback: (progress: any) => void) => {
    const listener = (_event: unknown, progress: any) => callback(progress);
    ipcRenderer.on("updater-download-progress", listener);
    return () => {
      ipcRenderer.removeListener("updater-download-progress", listener);
    };
  },
  onUpdaterUpdateDownloaded: (callback: (info: any) => void) => {
    const listener = (_event: unknown, info: any) => callback(info);
    ipcRenderer.on("updater-update-downloaded", listener);
    return () => {
      ipcRenderer.removeListener("updater-update-downloaded", listener);
    };
  },
  onMouseTrackingError: (callback: (error: string) => void) => {
    const listener = (_event: unknown, error: string) => callback(error);
    ipcRenderer.on("mouse-tracking-error", listener);
    return () => {
      ipcRenderer.removeListener("mouse-tracking-error", listener);
    };
  },
  checkMouseTrackingPermissions: () =>
    ipcRenderer.invoke("check-mouse-tracking-permissions"),
  openSystemPreferences: () => ipcRenderer.invoke("open-system-preferences"),
});
