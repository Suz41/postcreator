# PostCreator Pro

A lightweight, high-precision browser studio for generating publication-ready social media cards, carousels, and quote visuals.

- **Live Application**: [https://suz41.github.io/postcreator/](https://suz41.github.io/postcreator/)
- **Source Repository**: [https://github.com/Suz41/postcreator](https://github.com/Suz41/postcreator)

---

## Overview

### Purpose

Content creators, developers, and brands frequently need to generate branded quote graphics, announcement slides, carousel cards, and multi-image posts for platforms such as Instagram, Twitter/X, and LinkedIn.

Traditional desktop editing suites require cumbersome setup, manual canvas alignment, and manual aspect ratio math. Meanwhile, standard mobile editors frequently introduce lossy compression, distorted image scaling, and clustered watermarks that ruin visual balance.

PostCreator addresses these issues by delivering a focused, client-side card studio that operates entirely inside the browser. It combines responsive typography, Twitter-style multi-image grid layouts, vector brand placement, and un-distorted canvas exports into a streamlined workflow with zero account requirements, zero tracking, and zero server latency.

---

## Core Capabilities

### 1. Twitter / X Multi-Image Grid
- **Structured Grid Layouts**: Dynamically formats 1 to 4 attached images into Twitter/X signature presentations:
  - 1 Image: 16:9 full-width landscape banner.
  - 2 Images: 50/50 dual vertical split columns.
  - 3 Images: Full-height primary lead cell on the left with two stacked cells on the right.
  - 4 Images: 2x2 quad matrix.
- **Versatile Image Ingestion**:
  - Multi-file desktop picker (`Upload Image(s)`).
  - Incremental cell addition (`+ Add`) up to the 4-item cap.
  - Remote image URL import dialog (`URL`).
  - Native drag-and-drop directly onto the card preview.
  - Direct clipboard paste (`Ctrl+V` / `Cmd+V`).
- **Individual Item Management**: Each cell features an isolated removal badge to prune specific images without resetting the full set.

### 2. Brand & Watermark Placement
- **Vector Fidelity**: Powered by master SVG vector paths and high-resolution 2160x2160 assets, eliminating raster blur across all screen densities.
- **Dynamic Palette Adaptation**: Evaluates the canvas background luminance and automatically switches between white and dark watermark logos to guarantee high-contrast legibility.
- **Split-Corner Geometry**: Offsets the brand mark and social handle across opposite corners (e.g., logo at bottom-right, `@username` at bottom-left) to reflect professional Instagram editorial standards.
- **Display Configurations**:
  - `Logo + User`: Full watermark with opposite-corner spacing.
  - `Logo Only`: Minimalist brand mark.
  - `User Only`: Solo social handle.
- **Scale and Opacity Controls**: Fine-grained logo sizing from 16px to 34px, with opacity presets ranging from 100% Solid down to 20% Ghost.
- **Inline Editing**: Double-click or select the `@username` text directly on the canvas to update the handle in real time.

### 3. Balanced Typography & True Centering
- **Zero-Shift Vertical Centering**: Employs balanced top and bottom padding calculations. Adding, removing, or repositioning the watermark logo never shifts the core text away from the vertical center of the card.
- **Curated Typefaces**: Integrated Google Fonts including Inter, Poppins, Outfit, Playfair Display, and Syne.
- **Text Controls**: Font size (12px to 48px), bold, italic, line-height presets (1.2, 1.5, 1.8), and alignment (Left, Center, Right).
- **Built-in Grammar Correction**: Offline, zero-latency natural language processing that corrects typos, punctuation errors, and contractions locally.

### 4. Canvas Geometry & Color Engine
- **Aspect Ratio Presets**: 1:1 Square, 4:5 Portrait (Instagram carousel standard), 9:16 Story/Reel, 16:9 Landscape, 1.91:1, 4:3, 3:2, and 2:1.
- **Curated Color Palettes**: Single-click themes including Onyx Black, Pure White, Slate Navy, Zinc Charcoal, Emerald Deep, Crimson Ruby, and Cobalt Royal.
- **Interactive 2D Color Picker**: HSV saturation and brightness selector throttled via `requestAnimationFrame` for stutter-free 60 FPS scrubbing.
- **Container Styling**: Adjustable corner rounding (0px to 24px) and edge padding (16px to 36px).

### 5. High-Definition Un-Squeezed PNG Export
- **Aspect-Fit Pre-Cropping**: Solves the known `html2canvas` limitation regarding CSS `object-fit: cover` and `contain` by pre-rendering image buffers to exact container aspect ratios before canvas capture.
- **Logo Dimension Preservation**: Locks the explicit pixel height and aspect ratio of brand watermarks during high-DPI scaling.
- **Modal Preview & Direct Download**: Inspect the final output canvas in a full modal preview before triggering an instantaneous high-resolution PNG download.

---

## Performance & Optimization

PostCreator is engineered for minimal resource consumption and fast initial load times:

| Metric | Before Optimization | After Optimization | Delta |
| :--- | :--- | :--- | :--- |
| Initial JavaScript Bundle | 1,158.80 kB | 24.83 kB (8.74 kB gzip) | -97.8% |
| Blocking External Scripts | 1 CDN script | 0 (eliminated) | -100% |
| Grammar / NLP Engine | Eagerly bundled | Lazy-loaded on demand | Loaded only when clicked |
| Canvas Export Engine | Monolithic bundle | Dedicated split chunk | Loaded only on export |
| Color Scrubbing Frame Rate | Unthrottled mouse events | `requestAnimationFrame` | Steady 60 FPS |

---

## Technical Stack

- **Application Logic**: TypeScript (Strict Mode)
- **Markup & Styling**: Semantic HTML5, Vanilla CSS3 (Flexbox & CSS Grid)
- **Build System**: Vite 6
- **Canvas Rendering**: html2canvas with custom aspect-ratio pre-processing
- **Testing Frameworks**: Vitest (Unit Tests), Playwright (End-to-End Browser Automation)
- **NLP / Grammar Fallback**: Compromise, Nspell, English dictionary data

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
```bash
git clone https://github.com/Suz41/postcreator.git
cd postcreator
npm install
```

### Local Development
```bash
npm run dev
```
Navigate to `http://localhost:5173/postcreator/` in your browser.

### Production Build
```bash
npm run build
npm run preview
```
Compiled production assets are output to the `dist/` directory.

---

## Automated Verification

The repository maintains full test coverage across business logic, state mutations, and browser rendering:

```bash
# Execute unit tests via Vitest (38 tests)
npm test

# Execute end-to-end browser test suite via Playwright (15 tests)
npm run test:e2e
```

---

## Project Structure

```text
postcreator/
├── index.html                 # Core studio UI, toolbar controls, card canvas
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Bundler configuration and code-splitting rules
├── tsconfig.json              # TypeScript strict configuration
├── public/                    # Static assets (favicons, manifest, vector logos)
├── src/
│   ├── main.ts                # Application lifecycle, event listeners, DOM binding
│   ├── assets/                # Master SVG vector paths and high-DPI PNGs
│   ├── editor/
│   │   ├── state.ts           # Central state model, default settings, types
│   │   └── themes.ts          # Color classification and luminance calculations
│   ├── export/
│   │   └── render.ts          # Aspect-preserving html2canvas export pipeline
│   ├── image/
│   │   └── upload.ts          # Multi-image processing, scaling, drag & drop
│   └── services/
│       ├── grammar.ts         # Lazy-loaded text enhancement and spellcheck
│       └── enDictData.ts      # Offline dictionary dataset
└── tests/
    ├── export.test.ts         # Vitest unit test suite (38 tests)
    └── e2e/
        └── postcreator.spec.ts # Playwright browser test suite (15 tests)
```

---

## License

Distributed under the MIT License. Copyright (c) Sujal Achari.
