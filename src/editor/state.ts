export type AspectRatio =
  | "1 / 1"
  | "4 / 5"
  | "9 / 16"
  | "16 / 9"
  | "1.91 / 1"
  | "3 / 2"
  | "4 / 3"
  | "2 / 1";

export type TextAlign = "left" | "center" | "right";
export type ImagePosition = "above" | "below";
export type LogoPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "hide";

export type UserPosition = "opposite" | "left" | "right" | "below" | "beside";
export type BrandDisplay = "both" | "logo" | "username" | "none";

export interface EditorSettings {
  aspectRatio: AspectRatio;
  borderRadius: string;
  bg: string;
  fontColor: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  padding: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  hasImage: boolean;
  images: string[];
  imageFit: string;
  imageSize: number;
  imagePosition: ImagePosition;
  brandDisplay: BrandDisplay;
  logoPosition: LogoPosition;
  logoSize: number;
  logoOpacity: number;
  userPosition: UserPosition;
  brandName: string;
  brandHandle: string;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  aspectRatio: "1 / 1",
  borderRadius: "12px",
  bg: "#000000",
  fontColor: "#ffffff",
  fontFamily: "Inter",
  fontSize: "18",
  lineHeight: "1.5",
  padding: "24px",
  bold: false,
  italic: false,
  align: "center",
  hasImage: false,
  images: [],
  imageFit: "cover",
  imageSize: 100,
  imagePosition: "below",
  brandDisplay: "both",
  logoPosition: "bottom",
  logoSize: 34,
  logoOpacity: 0.8,
  userPosition: "opposite",
  brandName: "",
  brandHandle: "",
};

export interface ExportLimits {
  maxDimension: number;
  maxPixels: number;
}

export const DEFAULT_EXPORT_LIMITS: ExportLimits = {
  maxDimension: 2048,
  maxPixels: 4 * 1024 * 1024, // 4 megapixels
};

export interface ExportOptions {
  targetWidth: number;
  targetHeight: number;
  scale: number;
  backgroundColor: string;
  limits: ExportLimits;
}

export interface ExportResult {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  durationMs: number;
}

export interface AppError extends Error {
  code: "FONT_NOT_READY" | "IMAGE_NOT_READY" | "INVALID_FILE" | "CANVAS_ALLOCATION" | "RENDER_FAILED" | "NETWORK";
  recoverable: boolean;
}

export function createAppError(
  code: AppError["code"],
  message: string,
  recoverable = true,
): AppError {
  const err = new Error(message) as AppError;
  err.code = code;
  err.recoverable = recoverable;
  return err;
}

export const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isLightColor(hex: string): boolean {
  if (!isValidHex(hex)) return false;
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum >= 0.55;
}

export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex);
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hsvToRgb(h: number, s: number, v: number) {
  let c = v * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}
