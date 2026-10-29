import { describe, it, expect } from "vitest";
import {
  isValidHex,
  isLightColor,
  rgbToHex,
  hsvToRgb,
  DEFAULT_SETTINGS,
  DEFAULT_EXPORT_LIMITS,
  type EditorSettings,
  type AspectRatio,
} from "../src/editor/state";
import { PRESET_THEMES, themeForColor } from "../src/editor/themes";
import { computeExportDimensions } from "../src/export/render";
import { computeAspectLabel } from "../src/export/render";

describe("isValidHex", () => {
  const valid = ["#000000", "#ffffff", "#6366f1", "#ABCDEF"];
  const invalid = ["", "#gggggg", "#12345", "#1234567", "000000", "#1234"];
  for (const hex of valid) {
    it(`accepts ${hex}`, () => {
      expect(isValidHex(hex)).toBe(true);
    });
  }
  for (const hex of invalid) {
    it(`rejects ${hex}`, () => {
      expect(isValidHex(hex)).toBe(false);
    });
  }
});

describe("rgbToHex", () => {
  it("converts black", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });
  it("converts white", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
  });
  it("converts a mid color", () => {
    expect(rgbToHex(99, 102, 241)).toBe("#6366f1");
  });
});

describe("hsvToRgb", () => {
  it("red at hue 0", () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("green at hue 120", () => {
    expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 });
  });
  it("black at value 0", () => {
    expect(hsvToRgb(210, 1, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

function makeSettings(overrides: Partial<EditorSettings> = {}): EditorSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("computeExportDimensions", () => {
  it("preserves 1:1 ratio at baseline", () => {
    const card = document.createElement("div");
    card.style.width = "480px";
    card.style.height = "480px";
    document.body.appendChild(card);
    try {
      const opts = computeExportDimensions(makeSettings({ aspectRatio: "1 / 1" as AspectRatio }), card, DEFAULT_EXPORT_LIMITS);
      expect(opts.targetHeight).toBe(opts.targetWidth);
      expect(opts.targetWidth).toBeGreaterThanOrEqual(1080);
    } finally {
      document.body.removeChild(card);
    }
  });

  it("preserves portrait 4:5 ratio", () => {
    const card = document.createElement("div");
    card.style.width = "480px";
    card.style.height = "600px";
    document.body.appendChild(card);
    try {
      const opts = computeExportDimensions(makeSettings({ aspectRatio: "4 / 5" as AspectRatio }), card, DEFAULT_EXPORT_LIMITS);
      const expectedH = Math.round(opts.targetWidth * (5 / 4));
      expect(opts.targetHeight).toBe(expectedH);
    } finally {
      document.body.removeChild(card);
    }
  });

  it("preserves landscape 16:9 ratio", () => {
    const card = document.createElement("div");
    card.style.width = "480px";
    card.style.height = "270px";
    document.body.appendChild(card);
    try {
      const opts = computeExportDimensions(makeSettings({ aspectRatio: "16 / 9" as AspectRatio }), card, DEFAULT_EXPORT_LIMITS);
      const expectedH = Math.round(opts.targetWidth * (9 / 16));
      expect(opts.targetHeight).toBe(expectedH);
    } finally {
      document.body.removeChild(card);
    }
  });

  it("clamps to max dimension", () => {
    const card = document.createElement("div");
    card.style.width = "480px";
    card.style.height = "480px";
    document.body.appendChild(card);
    try {
      const smallLimits = { maxDimension: 300, maxPixels: 4 * 1024 * 1024 };
      const opts = computeExportDimensions(makeSettings({ aspectRatio: "1 / 1" as AspectRatio }), card, smallLimits);
      expect(opts.targetWidth).toBeLessThanOrEqual(300);
      expect(opts.targetHeight).toBeLessThanOrEqual(300);
    } finally {
      document.body.removeChild(card);
    }
  });

  it("clamps to max pixel budget preserving ratio", () => {
    const card = document.createElement("div");
    card.style.width = "480px";
    card.style.height = "480px";
    document.body.appendChild(card);
    try {
      const tinyLimits = { maxDimension: 9999, maxPixels: 100 };
      const opts = computeExportDimensions(makeSettings({ aspectRatio: "1 / 1" as AspectRatio }), card, tinyLimits);
      expect(opts.targetWidth * opts.targetHeight).toBeLessThanOrEqual(100);
      expect(opts.targetWidth).toBe(opts.targetHeight);
    } finally {
      document.body.removeChild(card);
    }
  });
});

describe("computeAspectLabel", () => {
  it.each([
    ["1 / 1", "1:1"],
    ["4 / 5", "4:5"],
    ["9 / 16", "9:16"],
    ["16 / 9", "16:9"],
    ["1.91 / 1", "1.91:1"],
    ["3 / 2", "3:2"],
    ["4 / 3", "4:3"],
    ["2 / 1", "2:1"],
  ])("converts %s to %s", (ratio, expected) => {
    expect(computeAspectLabel(ratio as AspectRatio)).toBe(expected);
  });
});

describe("AI Text Enhancement Services", () => {
  it("polishes typos, contractions, and punctuation", async () => {
    const { polishTextWithAI } = await import("../src/services/grammar");
    const result = polishTextWithAI("teh quick brown fox ,dont jump over the the lazy dog");
    expect(result.text).toContain("The quick brown fox, don't jump over the lazy dog");
    expect(result.fixes).toBeGreaterThan(0);
  });

  it("capitalizes sentences and single 'i'", async () => {
    const { polishTextWithAI } = await import("../src/services/grammar");
    const result = polishTextWithAI("yesterday i went to work. it was great!");
    expect(result.text).toBe("Yesterday I went to work. It was great!");
  });

  it("checkGrammar seamlessly falls back to local AI polisher on empty or offline", async () => {
    const { checkGrammar } = await import("../src/services/grammar");
    const res = await checkGrammar("cant wait for tommorrow !");
    expect(res.corrected).toBe("Can't wait for tomorrow!");
    expect(res.fixes).toBeGreaterThan(0);
  });

  it("combines Compromise NLP agreement and Nspell spellchecking without conflict", async () => {
    const { polishTextWithAI } = await import("../src/services/grammar");
    const res = polishTextWithAI("they is walking and recieve their award");
    expect(res.text).toBe("They are walking and receive their award");
    expect(res.fixes).toBeGreaterThan(0);
  });
});

describe("isLightColor and Logo Palette Compatibility", () => {
  it("classifies dark colors as not light (requires BBOG-white.png)", () => {
    expect(isLightColor("#000000")).toBe(false);
    expect(isLightColor("#0f172a")).toBe(false);
    expect(isLightColor("#18181b")).toBe(false);
    expect(isLightColor("#064e3b")).toBe(false);
    expect(isLightColor("#450a0a")).toBe(false);
    expect(isLightColor("#1e3a8a")).toBe(false);
    expect(isLightColor("#312e81")).toBe(false);
  });

  it("classifies bright colors as light (requires BBOG-Black.png)", () => {
    expect(isLightColor("#f9fafb")).toBe(true);
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#fef08a")).toBe(true);
    expect(isLightColor("#e2e8f0")).toBe(true);
  });

  it("safely handles invalid hex inputs", () => {
    expect(isLightColor("")).toBe(false);
    expect(isLightColor("#xyz")).toBe(false);
    expect(isLightColor("red")).toBe(false);
  });

  it("all 13 preset themes correctly map contrast text and logo variant", () => {
    expect(PRESET_THEMES.length).toBe(13);
    for (const theme of PRESET_THEMES) {
      const isLight = isLightColor(theme.bg);
      if (theme.bg === "#f9fafb") {
        expect(isLight).toBe(true);
        expect(theme.text).toBe("#111827"); // High contrast dark text on light canvas
      } else {
        expect(isLight).toBe(false);
        // All dark themes have high contrast light text
        expect(theme.text.startsWith("#f") || theme.text.startsWith("#e")).toBe(true);
      }
    }
  });

  it("themeForColor finds theme ignoring case", () => {
    expect(themeForColor("#000000")?.name).toBe("Black");
    expect(themeForColor("#F9FAFB")?.name).toBe("White");
  });
});
