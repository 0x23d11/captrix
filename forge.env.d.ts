/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

export {};

declare global {
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
    };
  }
}
