# Captrix Auto-Update Implementation Guide

## 1. Install electron-updater

```bash
npm install electron-updater
npm install --save-dev @types/electron-updater
```

## 2. Update package.json

```json
{
  "name": "captrix",
  "version": "1.0.0",
  "homepage": "https://github.com/yourusername/captrix",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/captrix.git"
  },
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "yourusername",
        "repo": "captrix"
      }
    ]
  }
}
```

## 3. Update forge.config.ts - Add GitHub Publisher

```typescript
import { PublisherGithub } from "@electron-forge/publisher-github";

const config: ForgeConfig = {
  // ... existing config
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "yourusername",
        name: "captrix",
      },
      prerelease: false,
      draft: true, // Create as draft first
    }),
  ],
  // ... rest of config
};
```

## 4. Add Auto-Updater to Main Process (src/main.ts)

```typescript
import { autoUpdater } from "electron-updater";
import { app, BrowserWindow, dialog } from "electron";

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Optional: Custom update behavior
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info.version);
  // Show notification to user
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available:", info.version);
});

autoUpdater.on("error", (err) => {
  console.log("Error in auto-updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond}`;
  message += ` - Downloaded ${progressObj.percent}%`;
  message += ` (${progressObj.transferred}/${progressObj.total})`;
  console.log(message);
  // Update progress bar in UI
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded:", info.version);
  // Show dialog asking user to restart
  dialog
    .showMessageBox({
      type: "info",
      title: "Update Ready",
      message: "Update downloaded. Restart Captrix to apply the update?",
      buttons: ["Restart Now", "Later"],
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});

// Check for updates when app is ready
app.whenReady().then(() => {
  // Wait a bit before checking for updates
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
});
```

## 5. Add Update UI Components (Optional)

Create an update status component in the UI:

```typescript
// src/UpdateStatus.tsx
import React, { useState, useEffect } from "react";

const UpdateStatus = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Listen for update events from main process
    window.electronAPI?.onUpdateAvailable?.((info) => {
      setUpdateInfo(info);
    });

    window.electronAPI?.onDownloadProgress?.((progress) => {
      setDownloadProgress(progress.percent);
    });
  }, []);

  if (!updateInfo) return null;

  return (
    <div className="alert alert-info">
      <div>
        <h4>Update Available</h4>
        <p>Version {updateInfo.version} is ready to download</p>
        {downloadProgress > 0 && (
          <progress
            className="progress progress-primary"
            value={downloadProgress}
            max="100"
          />
        )}
      </div>
    </div>
  );
};
```

## 6. Update GitHub Actions for Release

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build and publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run publish
```

## 7. Release Process

1. **Update version** in package.json
2. **Commit changes**: `git commit -am "v1.0.1"`
3. **Create tag**: `git tag v1.0.1`
4. **Push tag**: `git push origin v1.0.1`
5. **GitHub Actions** will automatically build and create release
6. **Users get automatic updates** within 24 hours

## 8. Alternative Approaches

### Option 1: Custom Server

- Host update files on your own server
- More control but requires infrastructure
- Good for enterprise or private distributions

### Option 2: App Store Distribution

- Mac App Store, Microsoft Store
- Handles updates automatically
- But requires app store approval process

### Option 3: Manual Check

- Add "Check for Updates" menu item
- User-initiated update checks
- Simpler but less automatic

## 9. Security Considerations

- **Code signing**: Required for automatic updates on macOS/Windows
- **HTTPS only**: All update downloads must be over HTTPS
- **Signature verification**: electron-updater verifies signatures automatically
- **Private repositories**: Need GitHub token for private repos

## 10. Testing Updates

```bash
# Test update process locally
npm run make
npm run publish -- --dry-run

# Test with different versions
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## 11. User Experience Features

- **Silent downloads** in background
- **Restart prompt** when update ready
- **Update notifications** in app
- **Progress indicators** during download
- **Rollback capability** if update fails
- **Delta updates** for faster downloads

This setup provides professional-grade automatic updates with minimal maintenance overhead!
