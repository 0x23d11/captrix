/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Display extends Electron.Display {}

  interface Window {
    electronAPI: {
      getSources: () => Promise<
        {
          id: string;
          name: string;
          thumbnailURL: string;
        }[]
      >;
      saveVideo: (buffer: ArrayBuffer) => Promise<string | undefined>;
      getDisplays: () => Promise<Display[]>;
      startMouseEventTracking: () => void;
      stopMouseEventTracking: () => void;
      onMouseClick: (
        callback: (position: { x: number; y: number }) => void
      ) => () => void;
      onMouseMove: (
        callback: (position: { x: number; y: number }) => void
      ) => () => void;
      onKeyboardActivity: (callback: () => void) => () => void;
      onGlobalShortcut: (callback: () => void) => () => void;
      onGlobalShortcutPauseResume: (callback: () => void) => () => void;
    };
  }
}
