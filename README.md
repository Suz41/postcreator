# PostCreator Pro 🚀

> Create stunning, high-definition Instagram quote cards, carousels, and Twitter/X-style multi-image posts in seconds.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-suz41.github.io%2Fpostcreator-6366f1?style=for-the-badge&logo=githubpages&logoColor=white)](https://suz41.github.io/postcreator/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-Playwright%20%2B%20Vitest-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

---

## ✨ Features

### 📸 Twitter / X Multi-Image Grid (1–4 Images)
- **Signature Layouts**: Supports 1, 2, 3, or 4 images with Twitter/X aspect ratios:
  - **1 Image**: 16:9 full-width landscape banner.
  - **2 Images**: Two 50/50 vertical split columns.
  - **3 Images**: Left lead image + two stacked right cells.
  - **4 Images**: 2×2 quad grid.
- **Flexible Import**:
  - Multi-file selector (`Upload Image(s)`).
  - Incremental `+ Add` button (up to 4 images).
  - Direct image **URL** import modal.
  - **Drag & drop** files directly onto the card.
  - **Clipboard paste** (`Ctrl+V` / `Cmd+V`).
- **Individual Controls**: Hover/touch close badge (`×`) on each image cell to remove specific photos independently.

---

### 🏷️ Brand & Watermark Studio
- **Vector Quality**: Powered by master vector SVG artwork (`BBOG-white.svg` and `BBOG-Black.svg`) with 2160×2160 ultra-HD rendering for zero pixelation.
- **Dynamic Palette Adaptation**: Automatically toggles between high-contrast white and dark logo variants based on background luminescence.
- **Split Corner Layout**:
  - Places Brand Logo in the bottom-right corner and `@username` handle in the bottom-left corner (or vice-versa).
  - Prevents username and logo clustering.
- **Dedicated Display Modes**:
  - `Logo + User`: Full watermark with split corners.
  - `Logo Only`: Clean minimal branding.
  - `User Only`: Solo social handle.
- **Sizing & Opacity**: Clamped 16px to 34px height with watermark opacity presets from 100% Solid down to 20% Ghost.
- **Interactive Editing**: Click directly on the `@username` in the card preview to edit inline with real-time toolbar synchronization.

---

### ✍️ Typography & Centered Layout
- **True Vertical Centering**: Balanced flexbox padding guarantees that text remains rock-solid in the dead center of the card when adding or removing logos.
- **Curated Google Fonts**: `Inter`, `Poppins`, `Outfit`, `Playfair Display`, and `Syne`.
- **Formatting Tools**: Bold, Italic, Text Alignment (Left, Center, Right), Font Size (12px to 48px), and Line Height (1.2, 1.5, 1.8).
- **Built-in AI Grammar Polish**: One-click local AI fix for typos, punctuation, and contractions with zero external network latency.

---

### 🎨 Color & Canvas Styling
- **Aspect Ratios**: 1:1 (Square), 4:5 (Instagram Portrait), 9:16 (Story/Reel), 16:9 (Landscape), 1.91:1, 4:3, 3:2, and 2:1.
- **Palette Presets**: Instant one-click themes including Onyx Black, Pure White, Slate Navy, Zinc Charcoal, Emerald Deep, Crimson Ruby, and Cobalt Royal.
- **Interactive Color Picker**: 2D saturation/brightness field throttled via `requestAnimationFrame` for smooth 60 FPS dragging.
- **Custom Borders & Padding**: Adjustable card corner radius (`0px` to `24px`) and margins (`16px` to `36px`).

---

### 🖼️ High-Definition Un-Squeezed PNG Export
- **Aspect Ratio Pre-Cropping**: Automatically handles CSS `object-fit: cover` and `contain` during HTML5 Canvas capture, preventing stretched or squashed photos.
- **Exact Logo Dimensions**: Preserves watermark height and proportions during high-DPI export.
- **Live Modal Preview**: View the exported PNG before saving, complete with one-click instant download.

---

## ⚡ Performance Benchmarks

| Metric | Before Optimization | After Optimization |
| :--- | :--- | :--- |
| **Initial JS Load** | `1,158.80 kB` | **`24.83 kB`** (`8.74 kB` gzipped) — **-97.8%** |
| **External Scripts** | Blocking CDN `<script>` | **0** (fully removed) |
| **Grammar Engine** | Bundled eagerly | **Lazy-loaded on demand** |
| **Canvas Export Engine** | Main bundle | **Separated chunk** (loaded on export) |
| **Color Picker Frame Rate** | Unthrottled mousemove | **60 FPS `requestAnimationFrame`** |

---

## 🛠️ Tech Stack

- **Core**: Vanilla TypeScript, HTML5 Canvas, CSS3 Modern Flexbox/Grid
- **Bundler & Tooling**: [Vite 6](https://vitejs.dev/)
- **Export Engine**: [html2canvas](https://html2canvas.hertzen.com/) with aspect-fit rendering
- **Testing**: [Vitest](https://vitest.dev/) (Unit) & [Playwright](https://playwright.dev/) (E2E Browser)
- **NLP / Spelling**: Compromise, Nspell, English dictionary (lazy-loaded)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
git clone https://github.com/Suz41/postcreator.git
cd postcreator
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173/postcreator/](http://localhost:5173/postcreator/) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

### Run Tests
```bash
# Run unit tests with Vitest (38 tests)
npm test

# Run end-to-end tests with Playwright (15 tests)
npm run test:e2e
```

---

## 📄 License

MIT © [Sujal Achari](https://github.com/Suz41)
