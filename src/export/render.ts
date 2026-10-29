import html2canvas from "html2canvas";
import type {
  EditorSettings,
  AspectRatio,
  ExportLimits,
  ExportOptions,
  ExportResult,
} from "../editor/state";
import { createAppError, type AppError } from "../editor/state";

const RATIO_MAP: Record<AspectRatio, { w: number; h: number }> = {
  "1 / 1": { w: 1, h: 1 },
  "4 / 5": { w: 4, h: 5 },
  "9 / 16": { w: 9, h: 16 },
  "16 / 9": { w: 16, h: 9 },
  "1.91 / 1": { w: 1.91, h: 1 },
  "3 / 2": { w: 3, h: 2 },
  "4 / 3": { w: 4, h: 3 },
  "2 / 1": { w: 2, h: 1 },
};

const MIN_OUTPUT_WIDTH = 1080;
const MIN_SCALE = 2;

export function computeExportDimensions(
  settings: EditorSettings,
  card: HTMLElement,
  limits: ExportLimits,
): ExportOptions {
  const baseWidth = card.offsetWidth || 480;
  const ratio = RATIO_MAP[settings.aspectRatio];
  const ratioHw = ratio.h / ratio.w;

  let targetWidth = Math.round(Math.max(MIN_OUTPUT_WIDTH, baseWidth * MIN_SCALE));
  let targetHeight = Math.round(targetWidth * ratioHw);

  if (targetWidth > limits.maxDimension) {
    targetWidth = limits.maxDimension;
    targetHeight = Math.round(targetWidth * ratioHw);
  }
  if (targetHeight > limits.maxDimension) {
    targetHeight = limits.maxDimension;
    targetWidth = Math.round(targetHeight / ratioHw);
  }

  const pixelBudget = limits.maxPixels;
  if (targetWidth * targetHeight > pixelBudget) {
    const scale = Math.sqrt(pixelBudget / (targetWidth * targetHeight));
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetWidth * ratioHw);
  }

  if (targetWidth < 1) targetWidth = 1;
  if (targetHeight < 1) targetHeight = 1;

  const scale = targetWidth / baseWidth;

  return {
    targetWidth,
    targetHeight,
    scale,
    backgroundColor: getComputedStyle(card).backgroundColor || "#000000",
    limits,
  };
}

function awaitFonts(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settled = () => {
      if (timer) clearTimeout(timer);
      resolve();
    };
    document.fonts.ready.then(settled, settled);
    timer = setTimeout(settled, timeoutMs);
  });
}

function awaitCardImages(card: HTMLElement, timeoutMs = 15000): Promise<void> {
  const images = Array.from(card.querySelectorAll("img")).filter(
    (img) => img.getAttribute("src") && img.getAttribute("src")!.length > 0,
  );
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const cleanup = () => {
          if (timer) clearTimeout(timer);
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
        };
        const onLoad = () => {
          cleanup();
          if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve();
          else reject(new Error(`Image failed to decode: ${img.src.slice(0, 80)}`));
        };
        const onError = () => {
          cleanup();
          reject(new Error(`Image failed to load: ${img.src.slice(0, 80)}`));
        };
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onError, { once: true });
        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Image loading timed out: ${img.src.slice(0, 80)}`));
        }, timeoutMs);
      });
    }),
  ).then(() => undefined);
}

function renderObjectFitDataUrl(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fit: "cover" | "contain",
  exportScale = 1,
): string {
  const canvas = document.createElement("canvas");
  const pixelScale = Math.max(1, exportScale);
  canvas.width = Math.max(1, Math.round(targetWidth * pixelScale));
  canvas.height = Math.max(1, Math.round(targetHeight * pixelScale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  const nw = img.naturalWidth || targetWidth;
  const nh = img.naturalHeight || targetHeight;

  if (fit === "cover") {
    const imgRatio = nw / nh;
    const targetRatio = canvas.width / canvas.height;
    let sx = 0;
    let sy = 0;
    let sw = nw;
    let sh = nh;

    if (imgRatio > targetRatio) {
      sw = Math.round(nh * targetRatio);
      sx = Math.round((nw - sw) / 2);
    } else {
      sh = Math.round(nw / targetRatio);
      sy = Math.round((nh - sh) / 2);
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  } else {
    // contain
    const imgRatio = nw / nh;
    const targetRatio = canvas.width / canvas.height;
    let dw = canvas.width;
    let dh = canvas.height;
    let dx = 0;
    let dy = 0;

    if (imgRatio > targetRatio) {
      dh = Math.round(canvas.width / imgRatio);
      dy = Math.round((canvas.height - dh) / 2);
    } else {
      dw = Math.round(canvas.height * imgRatio);
      dx = Math.round((canvas.width - dw) / 2);
    }

    ctx.drawImage(img, 0, 0, nw, nh, dx, dy, dw, dh);
  }

  return canvas.toDataURL("image/png");
}

function copyToExactCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, targetWidth, targetHeight);

  // Preserve aspect ratio without stretching/squeezing
  const sourceRatio = source.width / source.height;
  const targetRatio = targetWidth / targetHeight;

  let dw = targetWidth;
  let dh = targetHeight;
  let dx = 0;
  let dy = 0;

  if (Math.abs(sourceRatio - targetRatio) > 0.005) {
    if (sourceRatio > targetRatio) {
      dw = targetWidth;
      dh = Math.round(targetWidth / sourceRatio);
      dy = Math.round((targetHeight - dh) / 2);
    } else {
      dh = targetHeight;
      dw = Math.round(targetHeight * sourceRatio);
      dx = Math.round((targetWidth - dw) / 2);
    }
  }

  context.drawImage(source, dx, dy, dw, dh);
  return canvas;
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG generation produced an empty blob."));
      },
      "image/png",
      1,
    );
  });
}

export interface RenderContext {
  isExporting: boolean;
}

export async function renderCardToPng(
  card: HTMLElement,
  options: ExportOptions,
  renderCtx: RenderContext,
): Promise<ExportResult> {
  if (renderCtx.isExporting) {
    throw createAppError("RENDER_FAILED", "An export is already in progress.", true);
  }
  renderCtx.isExporting = true;

  const start = performance.now();
  const tempCanvases: HTMLCanvasElement[] = [];

  try {
    await Promise.all([awaitFonts(), awaitCardImages(card)]);

    const { targetWidth, targetHeight, scale, backgroundColor, limits } = options;
    const baseWidth = card.offsetWidth || 480;
    const expectedHeight = Math.round(baseWidth * (targetHeight / targetWidth));

    const rendered = await html2canvas(card, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: false,
      logging: false,
      ignoreElements: (el) => (el as HTMLElement).dataset.html2canvasIgnore === "true",
      onclone: (_clonedDoc, clonedElement) => {
        // Enforce exact pixel dimensions on the card clone so it matches target ratio exactly
        clonedElement.style.width = `${baseWidth}px`;
        clonedElement.style.height = `${expectedHeight}px`;
        clonedElement.style.minHeight = `${expectedHeight}px`;
        clonedElement.style.maxHeight = `${expectedHeight}px`;
        clonedElement.style.boxSizing = "border-box";

        // Pre-crop all images with object-fit so html2canvas cannot squeeze them
        const liveImgs = Array.from(card.querySelectorAll<HTMLImageElement>("img"));
        const clonedImgs = Array.from(clonedElement.querySelectorAll<HTMLImageElement>("img"));

        for (let i = 0; i < liveImgs.length; i++) {
          const liveImg = liveImgs[i];
          const clonedImg = clonedImgs[i];
          if (!liveImg || !clonedImg) continue;
          if (!liveImg.src || liveImg.naturalWidth === 0) continue;

          // BRAND LOGO: Must strictly preserve exact user-selected size (e.g. 34px/24px) without blowing up to 100%
          if (clonedImg.classList.contains("card-brand-logo") || clonedImg.id === "cardLogo") {
            const h = liveImg.style.height || `${liveImg.offsetHeight}px`;
            clonedImg.style.height = h;
            clonedImg.style.maxHeight = h;
            clonedImg.style.maxWidth = liveImg.style.maxWidth || "65px";
            clonedImg.style.width = "auto";
            clonedImg.style.objectFit = "contain";
            continue;
          }

          // POST MEDIA IMAGES: Pre-crop so grid cells cannot squeeze them
          const rect = liveImg.getBoundingClientRect();
          const w = rect.width || liveImg.offsetWidth;
          const h = rect.height || liveImg.offsetHeight;
          if (w <= 0 || h <= 0) continue;

          const style = window.getComputedStyle(liveImg);
          const fit = style.objectFit;
          if (fit === "cover" || fit === "contain") {
            try {
              const fittedDataUrl = renderObjectFitDataUrl(
                liveImg,
                w,
                h,
                fit as "cover" | "contain",
                scale,
              );
              clonedImg.src = fittedDataUrl;
              clonedImg.style.objectFit = "fill";
              clonedImg.style.width = "100%";
              clonedImg.style.height = "100%";
            } catch {
              // fallback to original src
            }
          }
        }
      },
    });
    tempCanvases.push(rendered);

    const finalCanvas =
      rendered.width === targetWidth && rendered.height === targetHeight
        ? rendered
        : copyToExactCanvas(rendered, targetWidth, targetHeight, backgroundColor);
    if (finalCanvas !== rendered) tempCanvases.push(finalCanvas);

    if (finalCanvas.width > limits.maxDimension || finalCanvas.height > limits.maxDimension) {
      throw createAppError(
        "CANVAS_ALLOCATION",
        `Rendered canvas (${finalCanvas.width}x${finalCanvas.height}) exceeds max dimension ${limits.maxDimension}.`,
        true,
      );
    }
    if (finalCanvas.width * finalCanvas.height > limits.maxPixels) {
      throw createAppError(
        "CANVAS_ALLOCATION",
        `Rendered canvas (${finalCanvas.width}x${finalCanvas.height}) exceeds max pixel budget ${limits.maxPixels}.`,
        true,
      );
    }

    const blob = await toPngBlob(finalCanvas);
    if (blob.size === 0) {
      throw createAppError("RENDER_FAILED", "Generated PNG is empty.", true);
    }

    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      objectUrl,
      width: finalCanvas.width,
      height: finalCanvas.height,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const appError =
      err instanceof Error && "code" in err
        ? (err as AppError)
        : createAppError("RENDER_FAILED", err instanceof Error ? err.message : "Export failed.", true);
    throw appError;
  } finally {
    renderCtx.isExporting = false;
    tempCanvases.forEach((c) => {
      c.width = 1;
      c.height = 1;
    });
  }
}

export interface PreviewAndDownloadArgs {
  result: ExportResult;
  popupImage: HTMLImageElement;
  downloadButton: HTMLAnchorElement | null;
}

export function previewAndDownload({ result, popupImage, downloadButton }: PreviewAndDownloadArgs): void {
  popupImage.src = result.objectUrl;
  if (downloadButton) {
    downloadButton.href = result.objectUrl;
    downloadButton.download = `postcreator-${Date.now()}.png`;
  }
}

export function revokeObjectUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export function computeAspectLabel(ratio: AspectRatio): string {
  const r = RATIO_MAP[ratio];
  return `${r.w}:${r.h}`;
}
