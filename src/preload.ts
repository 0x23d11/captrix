// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  saveVideo: (buffer: ArrayBuffer) => ipcRenderer.invoke("save-video", buffer),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  startMouseEventTracking: () => ipcRenderer.send("start-mouse-event-tracking"),
  stopMouseEventTracking: () => ipcRenderer.send("stop-mouse-event-tracking"),
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
});
