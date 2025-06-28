# Captrix Release Guide 🚀

This guide explains how to create new releases using our automated GitHub Actions workflow.

## Quick Release Process

### 1. Update Version

```bash
# Update version in package.json (choose one):
npm version patch    # 1.0.0 → 1.0.1 (bug fixes)
npm version minor    # 1.0.0 → 1.1.0 (new features)
npm version major    # 1.0.0 → 2.0.0 (breaking changes)
```

### 2. Push Version Tag

```bash
# Push the new tag to trigger automated release
git push origin --tags
```

### 3. Monitor Release

- Go to **Actions** tab in your GitHub repo
- Watch the automated build process
- Check **Releases** tab for the published release

## What Happens Automatically

1. **GitHub Actions Detects** new version tag (e.g., `v1.0.1`)
2. **Builds App** for Windows, macOS, and Linux
3. **Creates Release** with all platform installers
4. **electron-updater** automatically detects the new release
5. **Users Get Notified** in the app with update prompt

## Example Release Flow

```bash
# 1. Make your changes and commit them
git add .
git commit -m "Add new feature"

# 2. Update version and create tag
npm version minor  # Creates v1.1.0 tag

# 3. Push everything
git push origin main
git push origin --tags

# 4. Wait for GitHub Actions to build and release
# 5. Your users will get automatic update notifications!
```

## Release Types

- **Patch** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes, major updates

## Troubleshooting

### If Release Fails

1. Check the **Actions** tab for error details
2. Common issues:
   - Missing `GITHUB_TOKEN` (should be automatic)
   - Build errors (check console output)
   - Platform-specific build issues

### Manual Release

If automated release fails, you can always run:

```bash
npm run publish
```

## Platform Coverage

Our releases automatically build for:

- **Windows**: `.exe` installer
- **macOS**: `.dmg` installer
- **Linux**: `.deb` and `.rpm` packages

The auto-updater works seamlessly across all platforms! 🎯
