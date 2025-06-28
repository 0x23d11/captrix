import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { PublisherGithub } from "@electron-forge/publisher-github";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "{**/node_modules/uiohook-napi/**/*,**/uiohook-napi/**/*}",
    },
    ignore: [
      // Don't include source files in the package
      /\/src($|\/)/,
    ],
    // Add macOS specific configuration for media permissions (only for production builds)
    ...(process.env.NODE_ENV === "production" &&
      process.env.APPLE_ID && {
        osxSign: {
          entitlements: "entitlements.mac.plist",
          entitlementsInherit: "entitlements.mac.plist",
        } as any,
      }),
  },
  rebuildConfig: {
    // Skip rebuilding uiohook-napi in CI - use prebuilt binaries
    ...(process.env.CI && {
      onlyModules: [], // Don't rebuild any modules in CI
    }),
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP(
      {
        macUpdateManifestBaseUrl:
          "https://github.com/Hexploration-Inc/captrix/releases/latest/download/",
      },
      ["darwin"]
    ),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "Hexploration-Inc",
        name: "captrix",
      },
      prerelease: false,
      draft: true, // Create as draft first for testing
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: false, // Simplified for local development
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false, // Simplified for local development
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Allow loading from outside ASAR for development
    }),
  ],
};

export default config;
