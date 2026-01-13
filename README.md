# Giffit - YouTube to GIF Chrome Extension

Convert any YouTube video into a high-quality GIF directly from your browser! No more relying on YouTube's clip feature - select any 15-second segment from any video with precision controls.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Chrome](https://img.shields.io/badge/chrome-109%2B-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🎯 **Works on any YouTube video** - No need for YouTube's clip feature
- 🎬 **Custom video trimming** - Precise timeline scrubber with 20px/second zoom
- ⏱️ **15-second max GIFs** - Optimized for quality and file size
- 🎨 **Dark theme sidebar** - Seamless YouTube integration
- 🎛️ **Full control** - Adjust FPS (10-30), width (240-1280px), and quality
- 🔒 **100% client-side** - No data sent to servers, complete privacy
- 📱 **Real-time preview** - Control main YouTube player to preview your selection
- ⚡ **Fast processing** - Pure JavaScript encoding with gifenc
- 📊 **Progress tracking** - Real-time progress bar and status updates
- 💾 **Automatic downloads** - GIF downloads as soon as conversion completes

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Chrome 109+** or any Chromium-based browser
- Basic terminal/command line knowledge

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/giffit.git
   cd giffit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   This will create a `dist/` folder with the compiled extension.

4. **Load into Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Select the `dist/` folder from this project
   - The Giffit icon should appear in your extensions toolbar!

### Development Mode

For active development with automatic rebuilds:

```bash
npm run build -- --watch
```

After making changes:
1. Save your files
2. Go to `chrome://extensions/`
3. Click the reload icon on the Giffit extension
4. Test your changes on YouTube

## 📖 How to Use

### Step 1: Navigate to YouTube
Go to any YouTube video (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)

### Step 2: Click the Extension Icon
Click the **Giffit icon** in your Chrome toolbar. A dark sidebar will slide in from the right.

### Step 3: Select Your Range
Use the **timeline scrubber** at the bottom of the sidebar:
- **Drag the handles** to select start and end times
- **Horizontal scroll** for precise selection on longer videos
- **Click timeline** to jump the nearest handle to that position
- Maximum duration: **15 seconds**

### Step 4: Preview Your Selection
Use the **Video Controls** section:
- **⏮ Seek to Start** - Jump to the beginning of your selection
- **▶ Play Selection** - Play from start (pauses at end)
- **⏭ Seek to End** - Jump to the end of your selection
- Watch the "✓ Currently in selected range" indicator

### Step 5: Adjust Settings
Fine-tune your GIF in the **Settings** section:
- **Quality**: Low (smaller file) / Medium / High (best quality)
- **FPS**: 10-30 frames per second (higher = smoother, larger file)
- **Width**: 240-1280 pixels (higher = sharper, larger file)
- **Estimated size** is shown below

### Step 6: Convert & Download
1. Click **"🎬 Convert to GIF"**
2. Watch the progress bar (captures frames, then encodes GIF)
3. Click **"⬇️ Download GIF"** when complete
4. Your GIF is saved to your Downloads folder!

## 🎨 UI Overview

```
┌─────────────────────────────────┐
│  Giffit              [X]        │  ← Header (click X to close)
├─────────────────────────────────┤
│  VIDEO CONTROLS                 │
│  Selected Range: 5.2s - 15.0s   │  ← Range info
│  Duration: 9.8s                 │
│  ✓ Currently in selected range  │  ← Live indicator
│  [⏮] [▶] [⏭]                   │  ← Control buttons
├─────────────────────────────────┤
│  SELECT RANGE (MAX 15S)         │
│  [====|████████████|==========] │  ← Draggable timeline
│  Start: 5.2s      End: 15.0s    │
│  Duration: 9.8s / 15s max       │
│  ← Scroll to see more →         │  ← Hint for long videos
├─────────────────────────────────┤
│  SETTINGS                       │
│  Quality: [Medium ▾]            │
│  FPS: [●────────] 20            │
│  Width: [●────────] 480px       │
│  Estimated Size: ~4.5 MB        │
├─────────────────────────────────┤
│  [🎬 Convert to GIF]            │  ← Main action button
│  [████████░░] 80%               │  ← Progress bar
│  Encoding GIF...                │
│  [⬇️ Download GIF]              │  ← Download button
├─────────────────────────────────┤
│  ⚠️ For personal use only.      │  ← Legal disclaimer
│  Respect copyright laws.        │
└─────────────────────────────────┘
```

## 🛠️ Tech Stack

- **Framework**: Chrome Extension Manifest V3
- **UI Library**: React 18
- **Build Tool**: Vite 7
- **Media Processing**: [gifenc](https://github.com/mattdesl/gifenc) - Pure JavaScript GIF encoder
- **Language**: TypeScript
- **Styling**: CSS (Dark theme matching YouTube)

## 📁 Project Structure

```
giffit/
├── src/
│   ├── content/              # Content script (injected into YouTube)
│   │   ├── index.tsx        # Video detection, overlay injection
│   │   └── content.css      # Base content script styles
│   ├── components/          # React components
│   │   ├── Overlay.tsx      # Main sidebar UI
│   │   ├── Timeline.tsx     # Scrollable timeline scrubber
│   │   ├── VideoPreview.tsx # Video controls component
│   │   └── overlay.css      # Sidebar styling (dark theme)
│   ├── background/          # Background service worker
│   │   └── index.ts         # Extension icon click handler
│   ├── popup/               # Extension popup (settings)
│   │   ├── Popup.tsx
│   │   └── popup.css
│   └── utils/               # Utility functions
│       ├── videoProcessor.ts # GIF encoding with gifenc
│       └── youtubeParser.ts  # YouTube URL parsing
├── public/
│   └── icons/               # Extension icons (16, 48, 128px)
├── dist/                    # Build output (git-ignored)
├── manifest.json            # Extension configuration
├── vite.config.js           # Build configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
├── CLAUDE.md                # Development history
└── README.md                # This file
```

## 🔧 Development

### Available Scripts

```bash
npm install           # Install dependencies
npm run build         # Build for production (outputs to dist/)
npm run build:watch   # Build and watch for changes
npm run dev           # Start Vite dev server (for component testing)
npm run preview       # Preview production build
```

### Build Process

1. **TypeScript Compilation**: `tsconfig.json` → JavaScript
2. **React Bundling**: Vite bundles React components
3. **Entry Points**:
   - `content.js` - Content script loader
   - `content-main.js` - Bundled React overlay
   - `background.js` - Background service worker
   - `popup.js` - Extension popup
4. **Output**: Ready-to-load extension in `dist/`

### Testing Your Changes

1. Make changes to source files in `src/`
2. Run `npm run build` (or use `build:watch` for auto-rebuild)
3. Go to `chrome://extensions/`
4. Click the reload button (🔄) on the Giffit extension
5. Test on YouTube: `youtube.com/watch?v=...`
6. Check Chrome DevTools console for logs

### Debugging

**Content Script Console:**
```
Right-click page → Inspect → Console tab
Look for: [YouTube to GIF] logs
```

**Background Script Console:**
```
chrome://extensions/ → Giffit "Inspect views: service worker"
```

**React DevTools:**
Install React DevTools extension for Chrome to inspect component state.

## 📊 Technical Highlights

### Timeline Precision System
- **20 pixels per second** = Very precise selection
- **Example**: 10-minute video = 12,000px timeline (scrollable)
- **Auto-scroll** keeps selection visible
- **Frame-accurate snapping** based on FPS setting

### Video Processing
- **Frame extraction**: Seek video → Draw to canvas → Extract pixels
- **Color quantization**: gifenc's built-in palette optimization
- **Encoding**: Pure JavaScript (no Web Workers needed)
- **Performance**: ~30-60 seconds for 15-second GIF at 480p, 15fps

### 15-Second Constraint Logic
```typescript
// Ensures selection never exceeds 15 seconds
const handleEndTimeChange = (newEndTime: number) => {
  const maxEnd = Math.min(
    newEndTime,
    startTime + 15,      // Max 15s from start
    videoDuration        // Can't exceed video
  );
  setEndTime(maxEnd);
};
```

### Browser Compatibility
- **Chrome 109+** (Manifest V3 requirement)
- **Edge, Brave, Opera** (Chromium-based browsers)
- **Not supported**: Firefox (different extension API)

## ⚠️ Known Limitations

- **Maximum GIF duration**: 15 seconds (by design - larger GIFs become impractical)
- **Processing speed**: Slower than native tools (browser-based, single-threaded)
- **File size**: GIFs are large (15s at 480p ≈ 7-15 MB) - use lower FPS/quality for smaller files
- **Protected videos**: Some videos may have restrictions (region locks, age gates)
- **Live streams**: Not supported (requires on-demand video)

## 🚧 Troubleshooting

### Extension doesn't load
- Check Chrome version (must be 109+)
- Enable Developer mode in `chrome://extensions/`
- Check browser console for errors

### Icon doesn't appear on YouTube
- Refresh the YouTube page
- Check extension is enabled in `chrome://extensions/`
- Try disabling/re-enabling the extension

### Sidebar doesn't open
- Make sure you're on a `/watch?v=...` page (not homepage, not shorts)
- Check browser console for errors
- Try reloading the extension

### Conversion fails
- Check video is playing and loaded
- Try a different time range
- Check browser console for error messages
- Make sure video isn't DRM-protected

### GIF quality is poor
- Increase FPS (20-30 for smoother animation)
- Increase width (720px or higher)
- Set quality to "High"
- Note: Higher settings = larger files

## 📝 Roadmap

Planned features for future versions:

- [ ] **Custom FPS by dragging timeline faster** - Dynamic FPS based on drag speed
- [ ] **Batch processing** - Convert multiple segments at once
- [ ] **GIF optimization** - Dithering, better compression
- [ ] **MP4 export** - Smaller files, better quality (pending Worker solution)
- [ ] **Preset templates** - Common use cases (memes, reactions, etc.)
- [ ] **Keyboard shortcuts** - Quick access without clicking icon
- [ ] **Thumbnail preview** - Show frame at current position
- [ ] **Copy to clipboard** - Share GIFs without downloading

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details.

**Summary**: You can use, modify, and distribute this code freely. No warranty provided.

## ⚖️ Legal Disclaimer

**This extension is for personal, educational, and fair use only.**

- Respect YouTube's Terms of Service
- Only convert content you have permission to use
- Respect copyright laws and content creators' rights
- Not responsible for misuse of this tool
- YouTube is a trademark of Google LLC

## 🙏 Acknowledgments

- **[gifenc](https://github.com/mattdesl/gifenc)** by Matt DesLauriers - Pure JS GIF encoder
- **YouTube** - For the amazing video platform
- **Chrome Extensions Team** - For Manifest V3 documentation
- **React Team** - For the incredible UI library
- **Vite Team** - For the fast build tooling

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please follow existing code style and add comments for complex logic.

## 📞 Support

Having issues? Here's how to get help:

1. **Check this README** - Most common questions answered here
2. **Review CLAUDE.md** - Detailed development history and technical insights
3. **Check browser console** - Look for error messages
4. **Open an issue** - Describe your problem with steps to reproduce

## 🌟 Show Your Support

If you find this project useful:
- ⭐ Star this repository
- 🐛 Report bugs you find
- 💡 Suggest new features
- 🔀 Share with friends

---

**Built with ❤️ for the YouTube community**

*Last updated: January 12, 2026*
