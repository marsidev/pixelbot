
# Pixelbot - Enhanced Wplace Automation Extension

**Forked from**: [kalintas/wplace-bot](https://github.com/kalintas/wplace-bot)

A sophisticated browser extension for automating pixel placement on wplace.live with advanced features including image processing, real-time previews, and intelligent pixel management.

![Pixelbot Example](./screenshots/pixelbot-example.png?raw=true)

## 📥 **Quick Install (End Users)**

**🦊 Firefox:** Download the extension by clicking **[here](https://github.com/marsidev/pixelbot/releases/latest/download/pixelbot.xpi)**.

**⚠️ Installation Required:** Since this is an unsigned extension, you'll need to follow one of the [installation methods below](#installation-methods) - either temporary install or Firefox Developer Edition for permanent use.

**📋 TL;DR:** Download XPI → Go to `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → Select XPI → Open wplace.live and refresh.

**⚠️ Note:** Firefox-only extension. Chrome/Chromium is not yet supported.

---

## ✨ **Features**

### 🖼️ **Image Processing**
- **Drag & Drop Upload** - Upload images by dragging or clicking
- **Automatic Resizing** - Set width/height with optional aspect ratio lock
- **Live Preview** - See exactly how your image will look on the canvas
- **Color Conversion** - Smart conversion to wplace.live's color palette

### 🎨 **Dithering & Quality**
- **Multiple Algorithms** - Nearest, Floyd-Steinberg, Atkinson, Jarvis, Ordered
- **Gamma Adjustment** - Brighten/darken image conversion (0.1-3.0)
- **Ordered Patterns** - Pattern size control for ordered dithering (2-8)
- **Serpentine Mode** - Smoother gradients for error-diffusion algorithms
- **Edge Detection** - Draw only the outlines of your image

### 🎯 **Smart Automation**
- **Auto-Authentication** - No manual token extraction! Just paint 1 pixel manually
- **Pixel Analysis** - Only paints pixels that don't match the template
- **Energy Limit** - Set maximum charges to use per session (prevents waste)
- **Skip Re-processing** - Use pre-processed images directly (perfect for multi-account)
- **Auto Start** - Automatically resume after page refresh
- **Progress Tracking** - Real-time completion percentage and pixel counts
- **Charge Monitoring** - Live energy/droplet count with cooldown timers
- **Smart Validation** - Start button disabled until all requirements met

### 🎨 **Color Management**
- **Premium Colors** - Uses your unlocked premium colors automatically
- **Default Colors Only** - Option to use basic 32 colors for compatibility
- **Color Filter** - Enable/disable specific colors from your template
- **Usage Statistics** - See which colors are used most in your template

### 👁️ **Visual Overlay**
- **Template Overlay** - Semi-transparent preview on the actual canvas
- **Show/Hide Toggle** - Turn overlay on/off as needed
- **Classic Style** - 50% alpha blending for clear visibility

### ⚙️ **Configuration**
- **Starting Points** - Click canvas or use current location to set position
- **Copy/Paste Configs** - Share settings between accounts or templates
- **Persistent Settings** - All settings saved automatically
- **Clear All** - Quick reset of all settings and templates

### 📊 **User Interface**
- **Account Info** - Username, energy, droplets, and level progress display
- **Draggable Panel** - Move the bot interface anywhere on screen
- **Collapsible Sections** - Minimize/expand different setting groups
- **Responsive Design** - Works on different screen sizes

## 🚀 **Quick Start Guide**

### **🔐 Authentication Setup** (One-Time Only)
**Super simple!** No manual token extraction needed:

1. **Paint 1 pixel manually** - Choose any color, click anywhere on canvas
2. **Wait for pixel to be painted** - Let wplace.live complete the paint
3. **Start the bot** - Authentication token captured automatically!

✨ The bot will remember your authentication across browser sessions!

### **🎨 Basic Workflow**
1. **Upload Image** - Drag & drop or click to upload your template image
2. **Set Size** - Adjust width/height (lock aspect ratio if needed)
3. **Choose Algorithm** - Select dithering method (Floyd-Steinberg recommended)
4. **Set Starting Point** - Click on canvas or use "Set Current Location" button
5. **Configure Energy** - Set energy limit to prevent using all charges
6. **Start Bot** - Click "Start" and watch it paint automatically

### **Advanced Tips**
- **Skip Re-processing** - Enable to use pre-processed images without re-dithering (perfect for sharing templates between accounts with different color palettes)
- **Color Filter** - Disable colors you don't want to use (appears after processing image)
- **Edge Mode** - Enable "Draw edges only" for outline-style art
- **Gamma** - Increase for brighter images, decrease for darker
- **Overlay** - Toggle overlay to see template preview on canvas
- **Copy Config** - Save settings to share between accounts
- **Smart UI** - Advanced settings automatically show/hide based on your dithering algorithm

### **Multi-Account Workflow**
Perfect for managing multiple accounts with different premium color access:

1. **Process on Limited Account** - Create template on account with fewer colors
2. **Export Config** - Use "Copy Config" to save settings
3. **Import to Other Accounts** - Paste config on accounts with more colors
4. **Enable Skip Re-processing** - Avoids re-dithering with extra colors
5. **Consistent Results** - Same template works perfectly across all accounts

## 🛠️ **Building & Installing the Extension**

### **Prerequisites**
- Node.js 24+ and pnpm

### **Build the Extension**
```bash
git clone https://github.com/marsidev/pixelbot.git
cd pixelbot
pnpm install  # or npm install
pnpm build:xpi  # Creates ready-to-install XPI file
```

### **Installation Methods**

#### **Method 1: Temporary Installation (XPI File)**
**Quick testing** - Resets when Firefox restarts:

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `web-ext-artifacts/pixelbot.xpi`
4. Go to wplace.live, refresh and start using

#### **Method 2: Temporary Installation (From Source)**
**Development workflow** - Load directly from project folder:

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from project root
4. Navigate to wplace.live and refresh

**Note:** This extension is designed specifically for Firefox and will not work in Chrome/Chromium due to different extension APIs and security models.

#### **Method 3: Permanent Installation (Firefox Developer Edition)**
**Best for active development** - Survives browser restarts:

1. **Download**: [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
2. **Open Developer Edition** → Go to `about:config`
3. **Search**: `xpinstall.signatures.required` → Set to `false`
4. **Install**: Go to `about:addons` → "Install Add-on From File"
5. **Select**: `web-ext-artifacts/pixelbot.xpi`
6. **✅ Permanent installation** - No need to reload after restarts!

### **Development Commands**
```bash
pnpm build        # Build extension code
pnpm build:watch  # Watch mode for development
pnpm build:xpi    # Build + create XPI file
pnpm lint         # Run linter
pnpm lint:fix     # Fix linting issues
```

### **Creating Releases**
```bash
# Automated release (recommended)
pnpm release
# This will: bump version, commit, tag, and push automatically

# Manual process (if needed)
# 1. Update version in manifest.json and updates.json
# 2. git add . && git commit -m "v2.1.0: New features"
# 3. git tag v2.1.0 && git push origin main --tags
```

**⚡ GitHub Actions automatically builds and publishes the XPI file when you push tags.**

## 🔒 **Extension Signing (Optional)**

**For production distribution only** - Development uses unsigned XPI files:

```bash
# Manual signing (requires Mozilla API credentials)
pnpm build:xpi  # Build first
web-ext sign --api-key="YOUR_JWT_ISSUER" --api-secret="YOUR_JWT_SECRET" --channel="unlisted"
```

**Get API credentials at:** [addons.mozilla.org/developers/addon/api/key/](https://addons.mozilla.org/developers/addon/api/key/)

**💡 For development**: Use **Method 3** (Firefox Developer Edition) from installation methods above - no signing needed!

## 💻 **Architecture & Technical Details**

### **Modern Stack**
- **Build System**: Rolldown (Rust-based, ultra-fast bundling)
- **AST Manipulation**: Babel (for injecting hooks into wplace.live scripts)
- **Module Format**: IIFE for browser compatibility
- **Manifest**: V2
- **Styling**: CSS Custom Properties with Glassmorphism design

### **How It Works**
1. **Script Injection**: Uses Babel AST manipulation to inject hooks into wplace.live's main JavaScript bundle
2. **Auto-Authentication**: Intercepts fetch requests to automatically capture `x-pawtect-token` from manual painting
3. **CAPTCHA Integration**: Hooks into wplace.live's CAPTCHA system for automated token management
4. **Pixel Automation**: Coordinates with the injected hooks to place pixels automatically
5. **Real-time Feedback**: Provides live status updates and charge monitoring

### **Canvas Chunk System**

wplace.live organizes its infinite canvas using a **tile/chunk system** for efficient data management:

#### **📏 Chunk Structure**
- **Size**: Each chunk is exactly **1000×1000 pixels**
- **Grid System**: Canvas divided into coordinate-based tiles `(tileX, tileY)`
- **API Endpoints**:
  - Reading: `GET /files/s0/tiles/{tileX}/{tileY}.png`
  - Painting: `POST /s0/pixel/{tileX}/{tileY}`

#### **🎨 Artwork Distribution**
- **Most artworks (95%+)**: Fit within a single chunk → High efficiency
- **Large artworks**: May span 2-4 adjacent chunks → Handled automatically
- **Bot Intelligence**: Automatically detects and separates pixels by chunk location

#### **🔧 Bot Chunking Strategy**
When your template spans multiple chunks, Pixelbot:

1. **Analyzes** template positioning relative to chunk boundaries
2. **Separates** pixels into appropriate chunks (0-3 chunks possible):
   ```
   ┌─────────┬─────────┐
   │ Chunk 0 │ Chunk 1 │ ← Your template might
   │ (main)  │ (right) │   span multiple chunks
   ├─────────┼─────────┤
   │ Chunk 2 │ Chunk 3 │
   │ (down)  │ (diag)  │
   └─────────┴─────────┘
   ```
3. **Sends one chunk per captcha cycle** (5-second intervals)
4. **Repeats** until all chunks painted

This approach ensures **reliable painting** regardless of artwork size or canvas position while respecting wplace.live's anti-bot protection.

## 🙏 **Credits & Acknowledgments**

### **Original Project**
- **[kalintas/wplace-bot](https://github.com/kalintas/wplace-bot)** - The original wplace automation extension that this project is forked from. Credit to the innovative AST injection system and clean architecture.

### **Inspiration & Research**
Our development has been guided by studying several advanced projects in the Wplace ecosystem:

- **[WPlace-UltraBOT](references/WPlace-UltraBOT/)** - Revolutionary token interception and enterprise-grade architecture
- **[WPlace-AutoBOT](references/WPlace-AutoBOT/)** - Advanced automation suite with bookmarklet distribution
- **[Wplace-BlueMarble](references/Wplace-BlueMarble/)** - Professional template overlay system
- **[color_converter_wplace](references/color_converter_wplace/)** - Advanced color palette and dithering algorithms

*Detailed analyses of these projects can be found in the `/references/` directory.*

## 📁 **Project Structure**
```
pixelbot/
├── src/                    # Core extension files
│   ├── popup.html         # Modern glassmorphism UI
│   ├── popup.js           # UI logic and image processing
│   └── hooks.js           # Core bot functionality               # Reference project sources
├── background.js          # Extension background script
├── overrideScript.js      # Babel AST manipulation
├── rolldown.config.js     # Modern build configuration
└── manifest.json          # Extension manifest
```

# ⚠️ Disclaimer
This tool is for educational purposes only. I am not responsible for any bans, suspensions, or consequences that may occur from using this bot on wplace.live. Use at your own risk.
