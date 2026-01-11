# Testing Guide - YouTube Clip to GIF Extension

## Quick Test (Steps 1-4 Complete)

### 1. Load the Extension

1. **Build** (if not already done):
   ```bash
   npm run build
   ```

2. **Open Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

3. **Verify Installation**:
   - You should see "YouTube Clip to GIF" in your extensions list
   - Icon should appear in your Chrome toolbar
   - If there are any errors, check the extension's error console

### 2. Test the Popup

1. **Click the extension icon** in your Chrome toolbar
2. You should see:
   - A purple gradient popup interface
   - Settings for GIF quality, FPS, width, and duration
   - "Save Settings" button
3. **Try adjusting settings** and clicking "Save Settings"
   - Should see a success message

### 3. Test Clip Detection

1. **Go to YouTube**: https://youtube.com
2. **Find any video** (any video works for testing)
3. **Create a clip**:
   - Click the "Share" button under the video
   - Click "Clip" in the share menu
   - Set a start time (e.g., 0:05)
   - Set an end time (e.g., 0:15)
   - Click "Share clip" or view the clip

4. **Look for the "Create GIF" button**:
   - Should appear in the top-right corner of the page
   - Purple gradient button with 🎬 icon
   - May take 1-2 seconds to appear

### 4. Test the Overlay UI

1. **Click the "Create GIF" button**
2. You should see:
   - A modal overlay with white background
   - Clip information (duration, time range)
   - Format selection buttons (GIF, MP4, WebM)
   - Quality settings sliders
   - "Start Conversion" button
3. **Test the interface**:
   - Click different format buttons
   - Adjust the sliders
   - Click "Start Conversion" (will simulate progress - actual conversion not yet implemented)
4. **Watch the progress simulation**:
   - Progress bar should fill
   - Status text should update
   - Should complete at 100%

### 5. Check Browser Console

Open Chrome DevTools (F12 or Right-click → Inspect), then check Console tab for:

**Expected Messages:**
```
[YouTube to GIF] Content script loaded successfully
[YouTube to GIF] Parsed URL: { videoId: "...", clipId: null, ... }
[YouTube to GIF] Clip detected, injecting overlay
```

**Should NOT see:**
```
❌ Uncaught SyntaxError: Cannot use import statement outside a module
❌ Failed to load resource: net::ERR_FILE_NOT_FOUND
❌ Refused to execute inline script
```

### 6. Test URL Detection

The extension should detect various YouTube URL formats:

**Test these URL patterns:**

1. **Standard clip URL**:
   ```
   https://youtube.com/watch?v=VIDEO_ID&start=10&end=20
   ```

2. **YouTube short URL with clip**:
   ```
   https://youtu.be/VIDEO_ID?start=10&end=20
   ```

3. **YouTube's clip share feature**:
   ```
   https://youtube.com/clip/UgkxXXXXX
   ```

For each URL:
- The "Create GIF" button should appear
- Clicking it should show the correct clip duration
- Time range should be extracted properly

## Troubleshooting

### Extension Won't Load

**Problem**: Error when loading unpacked extension
**Solution**:
1. Make sure you selected the `dist` folder, not the root project folder
2. Check that `npm run build` completed without errors
3. Verify `dist/manifest.json` exists

### "Create GIF" Button Doesn't Appear

**Problem**: Button not showing on YouTube clip pages
**Solutions**:
1. Make sure you're on a clip URL (has `start` and `end` parameters)
2. Check browser console for errors
3. Try refreshing the YouTube page
4. Verify content.js is loading in DevTools → Sources tab

### Module Loading Errors

**Problem**: `Cannot use import statement outside a module`
**Solution**:
1. Make sure you're using the latest build
2. Check that both `content.js` and `content-main.js` exist in `dist/`
3. Verify `content-main.js` is in `web_accessible_resources` in manifest

### Overlay Won't Open

**Problem**: Button appears but clicking doesn't open overlay
**Solution**:
1. Check browser console for JavaScript errors
2. Verify `overlay.js` exists in `dist/`
3. Check that React chunks loaded properly (DevTools → Network tab)

## What's Working vs. What's Not

### ✅ Currently Working

- Extension loads in Chrome
- Popup interface functional
- Settings save/load
- YouTube clip detection
- "Create GIF" button appears
- Overlay modal opens
- UI controls work
- Progress simulation

### ⏳ Not Yet Implemented

- Actual video downloading
- FFmpeg integration
- GIF/video conversion
- File download functionality
- Real progress tracking
- Error handling for failed conversions

## Next Steps for Development

After verifying Steps 1-4 work:

1. **Integrate ffmpeg.wasm** - Load FFmpeg in the browser
2. **Implement video extraction** - Get video stream from YouTube
3. **Build conversion pipeline** - Actually convert video to GIF
4. **Add download** - Save the generated file
5. **Comprehensive testing** - Test on various clip types

---

**If you encounter any issues not covered here, check CLAUDE.md for session history and debugging info.**
