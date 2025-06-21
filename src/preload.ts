// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: (types: ("window" | "screen")[]) =>
    ipcRenderer.invoke("get-sources", types),
  saveRecording: (buffer: Uint8Array) =>
    ipcRenderer.invoke("save-recording", buffer),
  send: (channel, data) => {
    // Whitelist channels to prevent security issues
    const validChannels = ["area-selected", "area-selection-cancelled"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  selectArea: () => ipcRenderer.invoke("select-area"),
});
