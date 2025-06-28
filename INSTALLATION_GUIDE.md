# Installing Captrix on macOS 🍎

Due to Apple's security requirements, you may see a warning when installing Captrix. This is normal for apps not distributed through the Mac App Store. **Captrix is safe** - here's how to install it:

## Quick Installation

### Step 1: Download

Download the `captrix-darwin-arm64-[version].zip` file from the [Releases page](https://github.com/Hexploration-Inc/captrix/releases).

### Step 2: Extract

Double-click the downloaded zip file to extract `captrix.app`.

### Step 3: Install Safely

**If you see "captrix is damaged" error:**

1. **Right-click** on `captrix.app`
2. Select **"Open"** from the menu
3. Click **"Open"** again when prompted
4. Enter your password if requested

**Alternative method:**

```bash
# Open Terminal and run:
sudo xattr -d com.apple.quarantine /path/to/captrix.app
```

### Step 4: Move to Applications

Drag `captrix.app` to your `/Applications` folder.

## Why This Happens

Apple requires apps to be "notarized" (security scanned) to avoid this warning. We're working on implementing this for future releases to make installation seamless.

## Is Captrix Safe?

✅ **Open Source** - Full code available on GitHub  
✅ **No Network Access** - Works completely offline  
✅ **No Data Collection** - Your recordings stay on your device  
✅ **Community Verified** - Built with standard Electron framework

## Need Help?

If you encounter any issues, please [open an issue](https://github.com/Hexploration-Inc/captrix/issues) on GitHub.
