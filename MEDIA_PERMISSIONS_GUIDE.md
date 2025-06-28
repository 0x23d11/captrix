# Media Permissions Guide for Captrix

This guide explains how to build and use Captrix with proper camera and microphone permissions.

## Building the App

To build the app with proper permissions:

```bash
# Build the app
npm run make

# The built app will be in the `out` directory
```

## macOS Permissions Setup

### For App Users

When you first run the built Captrix app on macOS, you'll need to grant permissions:

1. **Camera Permission**: macOS will automatically prompt for camera access when you try to use webcam features
2. **Microphone Permission**: macOS will automatically prompt for microphone access when you try to record audio
3. **Screen Recording Permission**: Go to `System Preferences > Privacy & Security > Screen Recording` and add Captrix
4. **Accessibility Permission** (for auto-zoom): Go to `System Preferences > Privacy & Security > Accessibility` and add Captrix

### For Developers

If you're code signing the app for distribution:

1. Make sure you have a valid Apple Developer certificate
2. Set these environment variables (optional, for notarization):
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

## What's Been Fixed

### 1. Entitlements File

- Added `entitlements.mac.plist` with necessary permissions for:
  - Camera access (`com.apple.security.device.camera`)
  - Microphone access (`com.apple.security.device.microphone`)
  - Audio input (`com.apple.security.device.audio-input`)
  - Screen recording support
  - File system access for saving recordings

### 2. Forge Configuration

- Updated `forge.config.ts` to include entitlements in the build process
- Added proper macOS signing configuration

### 3. Main Process Permissions

- Added media permission handlers in `src/main.ts`
- Automatic approval of media permissions for the app
- Better logging for permission requests

## Testing the Fix

1. **Build the app**: `npm run make`
2. **Install the built app** from the `out` directory
3. **Run the installed app** (not from terminal)
4. **Test webcam and microphone** - they should work without issues
5. **Check permissions** in System Preferences if needed

## Troubleshooting

### App Still Can't Access Camera/Microphone

1. Check System Preferences > Privacy & Security > Camera - make sure Captrix is listed and enabled
2. Check System Preferences > Privacy & Security > Microphone - make sure Captrix is listed and enabled
3. Try removing the app from these lists and re-adding it
4. Restart the app after changing permissions

### Permissions Not Being Requested

1. Make sure you're running the **built app**, not the development version
2. The built app should be in `out/make/` directory
3. Check that `entitlements.mac.plist` exists in your project root
4. Verify the app was built with the entitlements by checking the build output

### Still Having Issues?

1. Check the Console app for any permission-related errors
2. Try building with `npm run make -- --verbose` for more detailed output
3. Ensure you're testing on the same architecture you built for (Intel vs Apple Silicon)

## Why This Happens

- **Development mode**: Electron apps run with different permissions in development
- **Production mode**: Built apps need explicit entitlements to access system resources
- **macOS Security**: macOS requires apps to declare their intentions to access camera/microphone
- **Code Signing**: Entitlements are embedded during the signing process

The fix ensures that the built app has the proper entitlements and permission handlers to access media devices just like the development version does.
