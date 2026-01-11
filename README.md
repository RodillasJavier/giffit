# YouTube Clip to GIF Chrome Extension

Convert YouTube clips into downloadable GIFs directly from your browser!

## 🎬 Features

- ✅ Works with YouTube's native "Share → Clip" feature
- ✅ Client-side processing (no server needed, privacy-friendly)
- ✅ Multiple output formats (GIF, MP4, WebM)
- ✅ Customizable quality settings
- ✅ Real-time progress tracking
- ✅ No data collection or tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome or Chromium-based browser
- YouTube account (for creating clips)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dartmouth-cs98/pre-project-FelipePavanelliBR.git
   cd pre-project-FelipePavanelliBR
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development Mode

For active development with auto-reload:

```bash
npm run watch
```

This will rebuild the extension whenever you make changes. You'll need to manually refresh the extension in Chrome after each build.

## 📖 How to Use

1. **Navigate to YouTube** and find a video you want to clip

2. **Create a clip** using YouTube's Share button:
   - Click "Share" under the video
   - Click "Clip"
   - Set your start and end times
   - Copy the clip link or click to view the clip

3. **Look for the "Create GIF" button** that appears on clip pages
   - Button appears in the top-right corner
   - Click it to open the conversion interface

4. **Configure your settings**:
   - Choose format (GIF, MP4, or WebM)
   - Adjust quality, FPS, and dimensions
   - See estimated file size

5. **Click "Start Conversion"** and wait for processing

6. **Download your GIF!**

## 🛠️ Tech Stack

- **Extension Framework**: Chrome Extension Manifest V3
- **UI Library**: React 18
- **Build Tool**: Vite
- **Media Processing**: ffmpeg.wasm
- **Language**: TypeScript

## 📁 Project Structure

```
pre-project-FelipePavanelliBR/
├── src/
│   ├── content/           # Content script (runs on YouTube pages)
│   ├── background/        # Background service worker
│   ├── components/        # React components (Overlay)
│   ├── popup/            # Extension popup UI
│   └── utils/            # Utility functions (URL parser, etc.)
├── public/
│   └── icons/            # Extension icons
├── manifest.json         # Extension configuration
├── vite.config.js        # Build configuration
└── package.json          # Dependencies
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start Vite dev server (for testing React components)
- `npm run build` - Build the extension for production
- `npm run watch` - Build and watch for changes
- `npm run preview` - Preview production build

### Building from Source

The build process:
1. Vite compiles TypeScript and React code
2. Bundles separate entry points (content, background, popup, overlay)
3. Copies manifest.json and icons to `dist/`
4. Outputs a ready-to-load Chrome extension in `dist/`

## ⚠️ Legal Disclaimer

**This extension is for personal, educational use only.**

- YouTube's Terms of Service prohibit unauthorized downloading of videos
- This tool should only be used for content you have permission to download
- Respect copyright laws and content creators' rights
- We are not responsible for misuse of this tool

## 🐛 Known Limitations

- Maximum recommended clip duration: 15 seconds (GIFs can get very large)
- Some YouTube videos may block extraction (Content ID, region restrictions)
- YouTube may change their clip URL structure, requiring updates
- Large clips may be slow to process (ffmpeg.wasm is slower than native)

## 📝 Next Steps

The basic foundation is complete! Here's what's coming next:

- [ ] Integrate ffmpeg.wasm for actual video processing
- [ ] Implement video stream extraction from YouTube
- [ ] Build GIF conversion pipeline with optimization
- [ ] Add download functionality
- [ ] Comprehensive testing on various clip types
- [ ] Error handling and user feedback improvements
- [ ] Add support for custom thumbnails
- [ ] Implement MP4/WebM conversion options

## 🤝 Contributing

This is a class project for Dartmouth CS98. Contributions and feedback are welcome!

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- ffmpeg.wasm team for making browser-based video processing possible
- YouTube for the clip sharing feature
- Dartmouth CS98 course staff

---

**Built with ❤️ by Felipe Pavanelli**
