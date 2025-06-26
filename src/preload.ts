// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  saveVideo: (buffer: ArrayBuffer) => ipcRenderer.invoke("save-video", buffer),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  startMouseEventTracking: () => ipcRenderer.send("start-mouse-event-tracking"),
  stopMouseEventTracking: () => ipcRenderer.send("stop-mouse-event-tracking"),
  onMouseActivity: (callback: (position: { x: number; y: number }) => void) => {
    const listener = (_event: unknown, position: { x: number; y: number }) =>
      callback(position);
    ipcRenderer.on("mouse-activity", listener);
    return () => {
      ipcRenderer.removeListener("mouse-activity", listener);
    };
  },
});
