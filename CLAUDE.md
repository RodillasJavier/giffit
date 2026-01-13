# Development Chat History

## Project: YouTube Clip to GIF Chrome Extension (Giffit)

### Session 1 - January 10, 2026

#### Project Overview
Building a Chrome extension that converts YouTube clips into downloadable GIFs using:
- **Approach**: Option 2 - Leverage YouTube's existing "Share Clip" feature
- **Tech Stack**:
  - Manifest V3 Chrome Extension
  - React for UI/overlays
  - ffmpeg.wasm for client-side media conversion (LATER CHANGED TO gifenc)
  - No backend API (client-side only for MVP)

#### Key Decisions Made

1. **User Flow**: Use YouTube's built-in clip feature rather than building custom video trimming
   - Pros: Faster MVP, better UX, less maintenance
   - Cons: Dependent on YouTube's feature

2. **Architecture**: Client-side processing
   - Video processing runs in browser
   - No server costs
   - Privacy-friendly (no data leaves user's browser)

3. **Tech Stack Rationale**:
   - React: Component-based UI for overlay
   - Vite: Fast build tooling for extension
   - ffmpeg.wasm: Industry standard for browser video processing

#### Current Status - ✅ Steps 1-4 COMPLETE!

**Completed Tasks:**

1. ✅ **Extension Structure Setup**
2. ✅ **YouTube Clip Detection**
3. ✅ **React UI Setup**
4. ✅ **Build System**

**Next Steps (To be implemented):**
- [ ] Video processing integration
- [ ] GIF conversion pipeline
- [ ] Download functionality

---

### Session 2 - Bug Fixes: ES Module Loading & Overlay Component

#### Bug Fix 1: ES Module Loading
- **Issue**: `Cannot use import statement outside a module`
- **Solution**: Two-layer loading system with content-loader.js wrapper

#### Bug Fix 2: Overlay Component Loading
- **Issue**: Vite tree-shook overlay component
- **Solution**: Bundle overlay directly into content-main.js

---

### Session 3-4 - January 12, 2026: Video Processing Implementation & Major Blockers

#### Video Processing Journey: FFmpeg → Offscreen Document → gifenc

##### Attempt 1: FFmpeg.wasm in Content Script ❌
**What We Tried:**
- Direct integration of ffmpeg.wasm in content script
- Used `VideoProcessor` class to handle conversion

**Why It Failed:**
```
SecurityError: Failed to construct 'Worker': Script at
'chrome-extension://xxx/assets/worker-xxx.js' cannot be
accessed from origin 'https://www.youtube.com'
```

**Root Cause:**
- Content scripts in Manifest V3 **cannot create Web Workers**
- FFmpeg.wasm requires Workers to function
- Even with `web_accessible_resources`, cross-origin Worker creation is blocked

---

##### Attempt 2: Offscreen Document Architecture ❌
**What We Tried:**
- Created offscreen document (`src/offscreen/offscreen.ts`, `offscreen.html`)
- Message passing: Content Script → Background → Offscreen → FFmpeg
- Added `offscreen` permission to manifest
- Implemented keepalive port connection to prevent service worker termination

**Implementation Details:**
```typescript
// Background script manages offscreen document
async function setupOffscreenDocument() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'FFmpeg video processing requires Web Workers'
  });
}

// Content script sends messages
chrome.runtime.sendMessage({
  type: 'CONVERT_VIDEO',
  data: videoData
});
```

**Bugs Fixed Along the Way:**
1. `import.meta` syntax error - Fixed by adding `type="module"` to offscreen.html
2. Chrome caching old offscreen.js - Fixed with version query parameter `?v=2`
3. Service worker termination - Fixed with long-lived port connections

**Why It STILL Failed:**
```
Loading the script 'blob:chrome-extension://xxx/...' violates
the following Content Security Policy directive:
"script-src 'self' 'wasm-unsafe-eval'"
```

**Root Cause:**
- FFmpeg.wasm creates **blob URLs for worker threads**
- Chrome Manifest V3 blocks **ALL blob URLs** in CSP, even with `wasm-unsafe-eval`
- This is a **fundamental incompatibility** - no workaround exists

---

##### Attempt 3: gifenc (Pure JavaScript) ✅ WORKING
**What We Did:**
- Switched from ffmpeg.wasm to **gifenc** library
- gifenc is pure JavaScript with **no Worker dependencies**
- Removed all offscreen document code

**Key Implementation:**
```typescript
// src/utils/videoProcessor.ts
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export class VideoProcessor {
  async processVideo(options: ConversionOptions): Promise<Blob> {
    const videoElement = document.querySelector('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Capture frames by seeking video
    const frames: Uint8ClampedArray[] = [];
    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = startTime + (i * frameDuration);
      await seeked event;
      ctx.drawImage(videoElement, 0, 0, width, height);
      frames.push(ctx.getImageData(0, 0, width, height).data);
    }

    // Encode with gifenc (no Workers needed!)
    const gif = GIFEncoder();
    for (const frame of frames) {
      const palette = quantize(frame, maxColors, { format: 'rgb565' });
      const index = applyPalette(frame, palette, 'rgb565');
      gif.writeFrame(index, width, height, { palette, delay });
    }
    gif.finish();

    return new Blob([gif.bytes()], { type: 'image/gif' });
  }
}
```

**Advantages:**
- ✅ No Web Workers required
- ✅ Works in content scripts
- ✅ Pure JavaScript (no WASM/blob URL issues)
- ✅ Built-in color quantization
- ✅ Smaller bundle size

**Trade-offs:**
- ⚠️ GIF-only (no MP4/WebM)
- ⚠️ Slower than multi-threaded FFmpeg
- ⚠️ Runs on main thread (can block UI)

---

#### UI/UX Redesign Attempts

##### Original Design (Working)
1. User navigates to YouTube clip page
2. Extension detects clip URL and injects "Create GIF" button overlay
3. User clicks button → conversion starts
4. Download GIF when complete

##### Attempted Redesign: URL-Based Workflow ❌ INCOMPLETE
**What We Tried:**
- User pastes clip URL into extension popup
- Extension opens clip page in background
- Extracts clip times from YouTube's page data
- Shows settings screen in popup
- Starts conversion

**Implementation:**
```typescript
// Multi-step popup wizard
type Step = 'input' | 'settings' | 'processing' | 'complete';

// Step 1: Paste URL
<input value={clipUrl} onChange={...} />
<button onClick={handleGifIt}>Gif-it! 🚀</button>

// Step 2: Extract times from page
await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CLIP_TIMES' });

// Step 3: Show settings
<div>Duration: {clipInfo.endTime - clipInfo.startTime}s</div>
<input type="range" value={fps} />
<button onClick={handleStartConversion}>Start Conversion</button>
```

**Major Blocker:**
- **Chrome closes popups when navigating to different tabs**
- Implemented `chrome.storage.local` session state persistence
- But content script wasn't responding to messages
- Progress stuck at 10%

**Issues Encountered:**
1. YouTube clip URLs don't include start/end times in URL parameters
2. Times must be extracted from page JavaScript data (`ytInitialData`)
3. Content script may not load by the time popup sends message
4. No reliable way to keep popup open during extraction

**Status:** ABANDONED - Too many race conditions and UX issues

---

### Current State (January 12, 2026)

#### ✅ What Works
1. **Extension Structure**: Manifest V3, Vite build system
2. **Clip Detection**: Automatically detects YouTube clip pages
3. **Overlay UI**: React overlay with settings (FPS, width, quality)
4. **GIF Encoding**: gifenc successfully creates GIFs from video frames
5. **Frame Capture**: Canvas-based frame extraction from HTML5 video element

#### ❌ What Doesn't Work / Needs Implementation
1. **Video Processing Not Integrated**:
   - VideoProcessor class exists but not connected to UI
   - Overlay doesn't trigger actual conversion yet

2. **Download Functionality**:
   - Blob creation works
   - Download trigger not implemented in UI

3. **Progress Tracking**:
   - Progress callbacks exist in VideoProcessor
   - Not wired up to UI progress bar

4. **Error Handling**:
   - Basic error messages
   - No retry logic or user-friendly error states

---

### Technical Architecture (Current)

```
Extension Structure:
├── manifest.json (Manifest V3)
├── Background Service Worker (background.js)
│   └── Minimal - just handles installation
├── Content Script (content.js → content-main.js)
│   ├── Detects YouTube clip pages
│   ├── Injects React overlay
│   └── Contains VideoProcessor
├── Popup (popup.html/js)
│   └── Settings interface
└── React Overlay (bundled in content-main.js)
    ├── UI for conversion
    ├── Settings controls
    └── Progress display

Key Files:
- src/utils/videoProcessor.ts - gifenc-based GIF creation
- src/components/Overlay.tsx - Main conversion UI
- src/content/index.tsx - Clip detection & overlay injection
- src/utils/youtubeParser.ts - URL parsing
- src/utils/clipExtractor.ts - Extract times from page data
```

---

### Critical Technical Insights

#### 1. **Chrome Extension Worker Limitations**
```
Content Scripts ❌ Cannot create Workers
Offscreen Documents ✅ Can create Workers, BUT...
  ❌ CSP blocks blob URLs (required by FFmpeg.wasm)
Background Service Workers ✅ Can use Workers, BUT...
  ❌ No access to page DOM/video element

Solution: Use pure JavaScript libraries (gifenc)
```

#### 2. **YouTube Clip URL Structure**
```
Format: https://youtube.com/clip/Ugkx...?si=...

⚠️ Start/end times NOT in URL!
✅ Must extract from page JavaScript:
   - window.ytInitialData
   - window.ytInitialPlayerResponse
   - Clip config objects
```

#### 3. **Chrome Popup Behavior**
```
⚠️ Popups close when:
   - User switches tabs
   - Extension opens a new tab
   - User clicks outside popup

Workaround: Use chrome.storage for state persistence
But: Complex workflow with background tabs is poor UX
```

#### 4. **Video Frame Capture**
```typescript
// Reliable method: Seek + draw to canvas
videoElement.currentTime = targetTime;
await new Promise(r => video.addEventListener('seeked', r, { once: true }));
ctx.drawImage(videoElement, 0, 0, width, height);
const frame = ctx.getImageData(0, 0, width, height).data;

⚠️ Must use { willReadFrequently: true } context attribute
⚠️ Video must be paused during capture
⚠️ Each seek is async - can be slow for many frames
```

---

### Known Bugs & Issues

#### 1. Background Script Caching
- Chrome aggressively caches background.js
- Requires complete extension removal + Chrome restart to clear
- Version number bump doesn't always help

#### 2. Console Logging Spam
- Fixed with throttling and debouncing
- MutationObserver now checks max once per second

#### 3. Content Script Loading Timing
- May not be ready when popup sends messages
- Need retry logic with delays

---

### Next Steps & Recommendations

#### Immediate Priorities (To Complete MVP)
1. **Connect VideoProcessor to Overlay UI**
   ```typescript
   // In Overlay.tsx
   const handleStartConversion = async () => {
     const processor = new VideoProcessor();
     const blob = await processor.processVideo(options, onProgress);
     downloadBlob(blob, filename);
   };
   ```

2. **Implement Download Function**
   ```typescript
   function downloadBlob(blob: Blob, filename: string) {
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = filename;
     a.click();
     URL.revokeObjectURL(url);
   }
   ```

3. **Wire Up Progress Bar**
   - Connect VideoProcessor progress callbacks to Overlay state
   - Update UI during capture and encoding phases

4. **Add Error Handling**
   - Try/catch in conversion flow
   - User-friendly error messages
   - Retry button

5. **Testing & Polish**
   - Test with various clip lengths
   - Optimize for performance
   - Add loading states

#### Future Enhancements
- [ ] Multiple output formats (if we solve Worker issue)
- [ ] Batch processing multiple clips
- [ ] Custom clip trimming without YouTube clip feature
- [ ] Quality presets (low/medium/high)
- [ ] Estimated file size preview
- [ ] GIF optimization (dithering, palette optimization)

---

### Dependencies & Environment

```json
{
  "dependencies": {
    "gifenc": "^1.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.3.0",
    "vite-plugin-static-copy": "^0.17.0"
  }
}
```

**Chrome Version Required:** 109+ (Manifest V3)

**Build Commands:**
```bash
npm install          # Install dependencies
npm run build        # Build extension to dist/
npm run dev          # Watch mode (not fully configured)
```

**Load Extension:**
1. `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select `dist/` folder
4. To clear cache: Remove extension + restart Chrome

---

### Lessons Learned

#### What Worked Well ✅
- React + Vite for extension development
- Content script bundling strategy
- gifenc for Worker-free GIF encoding
- URL parsing and clip detection
- Dynamic overlay injection

#### What Didn't Work ❌
- FFmpeg.wasm (Worker limitations)
- Offscreen document approach (CSP blob URL blocking)
- URL-based workflow (popup closing issues)
- Trying to extract clip times from URL (not in URL!)

#### Key Takeaways 💡
1. **Chrome Manifest V3 is restrictive** - many traditional approaches don't work
2. **Choose libraries carefully** - must work without Workers in content scripts
3. **Keep workflows simple** - complex popup interactions are problematic
4. **Test early and often** - Chrome extension debugging is difficult
5. **Document everything** - extension development has many gotchas

---

### For the Next Developer

#### Quick Start
```bash
git clone <repo>
cd giffit
npm install
npm run build
# Load dist/ folder in chrome://extensions/
```

#### Current Code Status
- ✅ **Compiles successfully**
- ✅ **Loads in Chrome without errors**
- ⚠️ **Conversion not fully wired up** (see Immediate Priorities)
- ✅ **All infrastructure ready** - just needs integration

#### Where to Look
- **Start here:** `src/components/Overlay.tsx:65-167` (handleStartConversion)
- **Video processor:** `src/utils/videoProcessor.ts:41-173`
- **Clip detection:** `src/content/index.tsx:39-124`

#### Testing a Change
```bash
npm run build
# Go to chrome://extensions/ → Click reload button
# Navigate to YouTube clip page
# Click "Create GIF" button
```

---

### Resources & References

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [gifenc Library](https://github.com/mattdesl/gifenc)
- [YouTube URL Structure](https://gist.github.com/rodrigoborgesdeoliveira/987683cfbfcc8d800192da1e73adc486)
- [Content Script Limitations](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

**Last Updated:** January 12, 2026
**Status:** Video processing implemented but not integrated with UI
**Ready for:** Final integration and testing
