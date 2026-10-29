import {
  DEFAULT_SETTINGS,
  isValidHex,
  isLightColor,
  rgbToHex,
  hsvToRgb,
  type EditorSettings,
  type AspectRatio,
  type LogoPosition,
  type BrandDisplay,
  type UserPosition,
  type ExportResult,
} from "./editor/state";
import { applyTheme, themeForColor } from "./editor/themes";
import { resetImage, readFileAsDataUrl } from "./image/upload";
import {
  renderCardToPng,
  previewAndDownload,
  revokeObjectUrl,
  computeExportDimensions,
  type RenderContext,
} from "./export/render";
import logoWhite from "./assets/BBOG-white.png";
import logoBlack from "./assets/BBOG-Black.png";

// DOM elements (guaranteed present by markup; asserted non-null).
const cardLogoWrapper = document.getElementById("cardLogoWrapper") as HTMLElement | null;
const cardLogo = document.getElementById("cardLogo") as HTMLImageElement | null;
const cardBrandHandle = document.getElementById("cardBrandHandle") as HTMLElement | null;

const brandDisplaySelect = document.getElementById("brandDisplaySelect") as HTMLSelectElement | null;
const logoPosSelect = document.getElementById("logoPosSelect") as HTMLSelectElement | null;
const logoSizeSelect = document.getElementById("logoSizeSelect") as HTMLSelectElement | null;
const logoOpacitySelect = document.getElementById("logoOpacitySelect") as HTMLSelectElement | null;
const brandHandleInput = document.getElementById("brandHandleInput") as HTMLInputElement | null;
const userPosSelect = document.getElementById("userPosSelect") as HTMLSelectElement | null;
const clearBrandBtn = document.getElementById("clearBrandBtn") as HTMLButtonElement | null;

const card = document.getElementById("card")!;
const editable = document.getElementById("editable")!;
const ratioSelect = document.getElementById("ratioSelect")! as HTMLSelectElement;
const radiusSelect = document.getElementById("radiusSelect")! as HTMLSelectElement;
const bgHexInput = document.getElementById("bgHex")! as HTMLInputElement;
const fontHexInput = document.getElementById("fontHex")! as HTMLInputElement;
const bgChip = document.getElementById("bgChip")!;
const fontChip = document.getElementById("fontChip")!;
const fontFamilySelect = document.getElementById("fontFamily")! as HTMLSelectElement;
const fontSizeSelect = document.getElementById("fontSize")! as HTMLSelectElement;
const boldBtn = document.getElementById("boldBtn")! as HTMLButtonElement;
const italicBtn = document.getElementById("italicBtn")! as HTMLButtonElement;
const quoteBtn = document.getElementById("quoteBtn")! as HTMLButtonElement;
const lineHeightSelect = document.getElementById("lineHeightSelect")! as HTMLSelectElement;
const paddingSelect = document.getElementById("paddingSelect")! as HTMLSelectElement;

const previewBtn = document.getElementById("previewBtn")! as HTMLButtonElement;
const popup = document.getElementById("popup")!;
const popupImage = document.getElementById("popupImage")! as HTMLImageElement;
const downloadBtn = document.getElementById("downloadBtn")! as HTMLAnchorElement;
const cancelBtn = document.getElementById("cancelBtn")! as HTMLButtonElement;
const toastEl = document.getElementById("toast")!;

const colorPanel = document.getElementById("colorPanel")!;
const colorPanelLabel = document.getElementById("colorPanelLabel")!;
const colorArea = document.getElementById("colorArea")! as HTMLCanvasElement;
const hueSlider = document.getElementById("hueSlider")! as HTMLInputElement;
const colorPanelDone = document.getElementById("colorPanelDone")! as HTMLButtonElement;

const imageBtn = document.getElementById("imageBtn")! as HTMLButtonElement;
const addImageBtn = document.getElementById("addImageBtn") as HTMLButtonElement | null;
const urlImageBtn = document.getElementById("urlImageBtn") as HTMLButtonElement | null;
const imageUpload = document.getElementById("imageUpload")! as HTMLInputElement;
const imageWrapper = document.getElementById("imageWrapper")!;
const cardImage = document.getElementById("cardImage") as HTMLImageElement | null;
const removeImage = document.getElementById("removeImage") as HTMLButtonElement | null;
const imgCountControl = document.getElementById("imgCountControl") as HTMLElement | null;
const imgCountBadge = document.getElementById("imgCountBadge") as HTMLElement | null;
const imgSizeControl = document.getElementById("imgSizeControl") as HTMLElement | null;
const imgSizeSelect = document.getElementById("imgSizeSelect") as HTMLSelectElement | null;
const imgFitControl = document.getElementById("imgFitControl")!;
const imgFitSelect = document.getElementById("imgFitSelect")! as HTMLSelectElement;
const imgPositionControl = document.getElementById("imgPositionControl")!;
const imgPosSelect = document.getElementById("imgPosSelect")! as HTMLSelectElement;

let loadedImages: string[] = [];
let isAppendingImages = false;

const clearBtn = document.getElementById("clearBtn")! as HTMLButtonElement;

const ctx = colorArea.getContext("2d")!;

let activeTarget: "bg" | "font" | null = null;
let isPicking = false;
let currentSettings: EditorSettings = { ...DEFAULT_SETTINGS };
let popupObjectUrl: string | null = null;
const exportCtx: RenderContext = { isExporting: false };

function showToast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function updateLogoTheme(hex: string): void {
  const isLight = isLightColor(hex);
  const activeLogo = isLight ? logoBlack : logoWhite;
  if (cardLogo) {
    cardLogo.src = activeLogo;
  }
  if (cardBrandHandle) {
    cardBrandHandle.style.color = isLight ? "rgba(17, 24, 39, 0.7)" : "rgba(255, 255, 255, 0.7)";
  }
}

function applyBrandDisplay(display: BrandDisplay): void {
  currentSettings.brandDisplay = display;
  if (brandDisplaySelect && brandDisplaySelect.value !== display) {
    brandDisplaySelect.value = display;
  }
  if (!cardLogoWrapper) return;

  if (display === "none") {
    cardLogoWrapper.style.display = "none";
    return;
  }

  if (currentSettings.logoPosition !== "hide") {
    cardLogoWrapper.style.display = "flex";
  }

  cardLogoWrapper.classList.remove("brand-both", "brand-user-only", "brand-logo-only");

  if (display === "logo") {
    cardLogoWrapper.classList.add("brand-logo-only");
    if (cardLogo) cardLogo.style.display = "block";
    if (cardBrandHandle) cardBrandHandle.style.display = "none";
    if (userPosSelect) userPosSelect.disabled = true;
  } else if (display === "username") {
    cardLogoWrapper.classList.add("brand-user-only");
    if (cardLogo) cardLogo.style.display = "none";
    if (!currentSettings.brandHandle.trim()) {
      setBrandHandle("@username");
    } else if (cardBrandHandle) {
      cardBrandHandle.style.display = "inline-block";
    }
    if (userPosSelect) userPosSelect.disabled = true;
  } else if (display === "both") {
    if (cardLogo) cardLogo.style.display = "block";
    if (currentSettings.brandHandle.trim().length > 0) {
      cardLogoWrapper.classList.add("brand-both");
      if (cardBrandHandle) cardBrandHandle.style.display = "inline-block";
    } else {
      if (cardBrandHandle) cardBrandHandle.style.display = "none";
    }
    if (userPosSelect) userPosSelect.disabled = false;
  }

  applyLogoSize(currentSettings.logoSize);
  applyUserPosition(currentSettings.userPosition);
}

function applyUserPosition(position: UserPosition): void {
  currentSettings.userPosition = position;
  if (userPosSelect && userPosSelect.value !== position) {
    userPosSelect.value = position;
  }
  if (!cardLogoWrapper) return;
  cardLogoWrapper.classList.remove(
    "user-pos-right",
    "user-pos-left",
    "user-pos-below",
    "user-pos-opposite",
    "user-pos-beside"
  );
  cardLogoWrapper.classList.add(`user-pos-${position}`);
}

function applyCardPadding(): void {
  const padHoriz = paddingSelect?.value || currentSettings.padding || "24px";
  currentSettings.padding = padHoriz;

  const hasMedia = currentSettings.hasImage && loadedImages.length > 0;

  // Keep top and bottom padding strictly balanced so text and content remain perfectly centered
  const verticalPad = hasMedia ? "28px" : padHoriz;

  card.style.paddingTop = verticalPad;
  card.style.paddingRight = padHoriz;
  card.style.paddingBottom = verticalPad;
  card.style.paddingLeft = padHoriz;
}

function applyLogoPosition(position: LogoPosition): void {
  currentSettings.logoPosition = position;
  if (!cardLogoWrapper) return;
  if (position === "hide" || currentSettings.brandDisplay === "none") {
    cardLogoWrapper.style.display = "none";
    applyCardPadding();
    return;
  }

  cardLogoWrapper.style.display = "flex";

  // Anchor to canvas with exact position class
  cardLogoWrapper.className = "card-brand-footer";
  cardLogoWrapper.classList.add(`pos-${position}`);
  if (position === "bottom") cardLogoWrapper.classList.add("pos-bottom-center");
  if (position === "top") cardLogoWrapper.classList.add("pos-top-center");
  cardLogoWrapper.classList.add(`user-pos-${currentSettings.userPosition}`);

  if (currentSettings.brandDisplay === "both" && currentSettings.brandHandle.trim().length > 0) {
    cardLogoWrapper.classList.add("brand-both");
  } else if (currentSettings.brandDisplay === "username") {
    cardLogoWrapper.classList.add("brand-user-only");
  } else if (currentSettings.brandDisplay === "logo") {
    cardLogoWrapper.classList.add("brand-logo-only");
  }

  applyCardPadding();
}

function applyLogoSize(size: number): void {
  const clampedSize = Math.min(34, Math.max(12, size));
  currentSettings.logoSize = clampedSize;
  if (cardLogo) {
    cardLogo.style.height = `${clampedSize}px`;
    cardLogo.style.maxWidth = `${Math.round(clampedSize * 1.8)}px`;
  }

  if (cardBrandHandle) {
    const handleSize = currentSettings.brandDisplay === "username"
      ? Math.max(11, Math.round(clampedSize * 0.44))
      : Math.max(9.5, Math.round(clampedSize * 0.38));
    cardBrandHandle.style.fontSize = `${handleSize}px`;
    cardBrandHandle.style.lineHeight = "1.2";
  }

  if (cardLogoWrapper) {
    const gap = Math.max(4, Math.round(clampedSize * 0.18));
    cardLogoWrapper.style.gap = `${gap}px`;
  }
}

function applyLogoOpacity(opacity: number): void {
  currentSettings.logoOpacity = opacity;
  if (cardLogo) {
    cardLogo.style.opacity = String(opacity);
  }
  if (cardBrandHandle) {
    cardBrandHandle.style.opacity = String(opacity);
  }
}

function setBrandHandle(handle: string): void {
  currentSettings.brandHandle = handle;
  if (cardBrandHandle) {
    const trimmed = handle.trim();
    if (trimmed.length > 0) {
      cardBrandHandle.textContent = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
      if (currentSettings.brandDisplay === "logo" || currentSettings.brandDisplay === "none") {
        cardBrandHandle.style.display = "none";
        cardLogoWrapper?.classList.remove("brand-both");
      } else {
        cardBrandHandle.style.display = "inline-block";
        if (currentSettings.brandDisplay === "both") {
          cardLogoWrapper?.classList.add("brand-both");
        }
      }
    } else {
      cardBrandHandle.textContent = "";
      cardBrandHandle.style.display = "none";
      cardLogoWrapper?.classList.remove("brand-both");
    }
  }
  if (brandHandleInput && brandHandleInput.value !== handle) {
    brandHandleInput.value = handle;
  }
}

function applyBg(hex: string): void {
  card.style.backgroundColor = hex;
  bgChip.style.backgroundColor = hex;
  bgHexInput.value = hex;
  currentSettings.bg = hex;
  updateLogoTheme(hex);
}

function applyFontColor(hex: string): void {
  editable.style.color = hex;
  fontChip.style.backgroundColor = hex;
  fontHexInput.value = hex;
  currentSettings.fontColor = hex;
}

function drawColorArea(): void {
  const w = colorArea.width;
  const h = colorArea.height;
  const hue = Number(hueSlider.value);

  const base = ctx.createLinearGradient(0, 0, w, 0);
  const rgbHue = hsvToRgb(hue, 1, 1);
  base.addColorStop(0, "#ffffff");
  base.addColorStop(1, rgbToHex(rgbHue.r, rgbHue.g, rgbHue.b));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const valGrad = ctx.createLinearGradient(0, 0, 0, h);
  valGrad.addColorStop(0, "rgba(0,0,0,0)");
  valGrad.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = valGrad;
  ctx.fillRect(0, 0, w, h);
}

function openColorPanel(target: "bg" | "font"): void {
  activeTarget = target;
  colorPanelLabel.textContent = target === "bg" ? "Background Color" : "Font Color";
  colorPanel.classList.add("show");
  drawColorArea();
}

function pickColorFromArea(clientX: number, clientY: number): void {
  const rect = colorArea.getBoundingClientRect();
  let x = clientX - rect.left;
  let y = clientY - rect.top;
  x = Math.max(0, Math.min(rect.width - 1, x));
  y = Math.max(0, Math.min(rect.height - 1, y));
  const data = ctx.getImageData(x, y, 1, 1).data;
  const hex = rgbToHex(data[0], data[1], data[2]);
  if (activeTarget === "bg") applyBg(hex);
  else applyFontColor(hex);
}

function updateEditableStyle(): void {
  editable.style.fontFamily = fontFamilySelect.value;
  editable.style.fontSize = `${fontSizeSelect.value}px`;
  editable.style.lineHeight = lineHeightSelect.value;
  applyCardPadding();
  editable.style.fontWeight = currentSettings.bold ? "700" : "400";
  editable.style.fontStyle = currentSettings.italic ? "italic" : "normal";
  editable.style.textAlign = currentSettings.align;
}

function setAlignment(align: "left" | "center" | "right", activeBtn: HTMLElement): void {
  editable.style.textAlign = align;
  currentSettings.align = align;
  [document.getElementById("alignLeft"), document.getElementById("alignCenter"), document.getElementById("alignRight")]
    .forEach((b) => b && b.classList.remove("active"));
  activeBtn.classList.add("active");
}

function renderMediaGrid(): void {
  if (!imageWrapper) return;

  if (loadedImages.length === 0) {
    imageWrapper.className = "card-image-wrapper";
    imageWrapper.style.display = "none";
    imageWrapper.innerHTML = `
      <div class="x-media-cell" data-index="0" style="display: none;">
        <img class="card-image x-media-img" id="cardImage" alt="Uploaded post media" />
        <button class="remove-image remove-media-item" id="removeImage" data-index="0" data-html2canvas-ignore="true" title="Remove image">&times;</button>
      </div>
    `;
    card.classList.remove("has-media");
    currentSettings.hasImage = false;
    currentSettings.images = [];
    if (imgSizeControl) imgSizeControl.style.display = "none";
    if (imgFitControl) imgFitControl.style.display = "none";
    if (imgPositionControl) imgPositionControl.style.display = "none";
    if (imgCountControl) imgCountControl.style.display = "none";
    if (addImageBtn) addImageBtn.style.display = "none";
    applyCardPadding();
    return;
  }

  card.classList.add("has-media");
  currentSettings.hasImage = true;
  currentSettings.images = [...loadedImages];

  const count = Math.min(4, loadedImages.length);
  imageWrapper.className = `card-image-wrapper has-image grid-${count}`;
  imageWrapper.style.display = "grid";

  let html = "";
  for (let i = 0; i < count; i++) {
    const isFirst = i === 0;
    const imgId = isFirst ? 'id="cardImage"' : "";
    const btnId = isFirst ? 'id="removeImage"' : "";
    html += `
      <div class="x-media-cell" data-index="${i}">
        <img class="card-image x-media-img" ${imgId} src="${loadedImages[i]}" alt="Post media ${i + 1}" />
        <button class="remove-media-item ${isFirst ? 'remove-image' : ''}" ${btnId} data-index="${i}" data-html2canvas-ignore="true" title="Remove image ${i + 1}">&times;</button>
      </div>
    `;
  }
  imageWrapper.innerHTML = html;

  // Bind click listener to remove buttons
  imageWrapper.querySelectorAll(".remove-media-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number((btn as HTMLElement).dataset.index);
      if (!isNaN(idx)) {
        removeImageAtIndex(idx);
      }
    });
  });

  if (imgSizeControl) imgSizeControl.style.display = "flex";
  if (imgFitControl) imgFitControl.style.display = "flex";
  if (imgPositionControl) imgPositionControl.style.display = "flex";
  if (imgCountControl) {
    imgCountControl.style.display = "flex";
    if (imgCountBadge) {
      imgCountBadge.textContent = `${count}/4 (X Grid)`;
    }
  }
  if (addImageBtn) {
    addImageBtn.style.display = count < 4 ? "inline-flex" : "none";
  }

  handleImageFit();
  handleImageSize();
  applyLogoPosition(currentSettings.logoPosition);
}

function removeImageAtIndex(idx: number): void {
  loadedImages.splice(idx, 1);
  imageUpload.value = "";
  renderMediaGrid();
  showToast(loadedImages.length > 0 ? "Image removed" : "All images removed");
}

function handleImageFit(): void {
  const val = imgFitSelect.value;
  currentSettings.imageFit = val;
  const imgs = imageWrapper.querySelectorAll<HTMLImageElement>(".card-image");

  if (val === "contain") {
    imgs.forEach((img) => {
      img.style.objectFit = "contain";
    });
    imageWrapper.style.aspectRatio = "unset";
  } else if (val === "cover") {
    imgs.forEach((img) => {
      img.style.objectFit = "cover";
    });
    imageWrapper.style.aspectRatio = "16 / 9";
  } else {
    imgs.forEach((img) => {
      img.style.objectFit = "cover";
    });
    imageWrapper.style.aspectRatio = val;
  }
}

function handleImagePosition(): void {
  currentSettings.imagePosition = imgPosSelect.value as "above" | "below";
  if (imgPosSelect.value === "above") {
    card.insertBefore(imageWrapper, editable);
  } else {
    card.appendChild(imageWrapper);
  }
  applyLogoPosition(currentSettings.logoPosition);
}

function handleImageSize(): void {
  const pct = Number(imgSizeSelect?.value || currentSettings.imageSize || 100);
  currentSettings.imageSize = pct;
  if (!imageWrapper) return;
  imageWrapper.style.maxWidth = `${pct}%`;
  imageWrapper.style.width = `${pct}%`;
  const imgs = imageWrapper.querySelectorAll<HTMLImageElement>(".card-image");
  imgs.forEach((img) => {
    img.style.maxWidth = `${pct}%`;
  });
}

async function handleImageUpload(file: File): Promise<void> {
  await handleMultipleImageFiles([file], true);
}

async function handleMultipleImageFiles(files: FileList | File[], append = isAppendingImages): Promise<void> {
  const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (fileArray.length === 0) return;

  if (!append) {
    loadedImages = [];
  }

  const availableSlots = 4 - loadedImages.length;
  if (availableSlots <= 0) {
    showToast("Maximum 4 images allowed (Twitter / X grid)");
    return;
  }

  const toLoad = fileArray.slice(0, availableSlots);
  let loadedCount = 0;
  for (const f of toLoad) {
    try {
      const dataUrl = await readFileAsDataUrl(f);
      loadedImages.push(dataUrl);
      loadedCount++;
    } catch (e) {
      console.warn("Failed to load file:", f.name, e);
    }
  }

  isAppendingImages = false;
  renderMediaGrid();
  showToast(`${loadedCount} image${loadedCount > 1 ? "s" : ""} added (${loadedImages.length}/4 X Grid)`);
}

async function handleImageUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return;

  if (loadedImages.length >= 4) {
    showToast("Maximum 4 images allowed (Twitter / X grid)");
    return;
  }

  try {
    showToast("Loading image from URL...");
    const testImg = new Image();
    testImg.crossOrigin = "anonymous";
    testImg.src = cleanUrl;
    await new Promise<void>((resolve, reject) => {
      testImg.onload = () => resolve();
      testImg.onerror = () => reject(new Error("Unable to load image from URL."));
      setTimeout(() => reject(new Error("Image URL request timed out.")), 10000);
    });

    loadedImages.push(cleanUrl);
    renderMediaGrid();
    showToast(`Image loaded (${loadedImages.length}/4 X Grid)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load image URL.";
    showToast(msg);
  }
}

function handleExport(): void {
  if (exportCtx.isExporting) return;

  previewBtn.textContent = "Generating...";
  previewBtn.disabled = true;

  const limits = { maxDimension: 2048, maxPixels: 4 * 1024 * 1024 };
  const options = computeExportDimensions(currentSettings, card, limits);

  renderCardToPng(card, options, exportCtx)
    .then((result: ExportResult) => {
      previewAndDownload({ result, popupImage, downloadButton: downloadBtn });
      popupObjectUrl = result.objectUrl;
      popup.classList.add("show");
      showToast("Export ready!");
      previewBtn.textContent = "Export High-Res PNG";
      previewBtn.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Export failed";
      showToast(msg);
      previewBtn.textContent = "Export High-Res PNG";
      previewBtn.disabled = false;
    });
}

function handleDownload(): void {
  if (!popupImage.src) return;
  const link = document.createElement("a");
  link.download = `postcreator-${Date.now()}.png`;
  link.href = popupImage.src;
  link.click();
  showToast("Image downloaded!");
}

function handleCancel(): void {
  popup.classList.remove("show");
  if (popupObjectUrl) {
    revokeObjectUrl(popupObjectUrl);
    popupObjectUrl = null;
  }
  popupImage.src = "";
}

function clearText(): void {
  editable.textContent = "";
  editable.focus();
  showToast("Cleared text");
}

function init(): void {
  applyBg(currentSettings.bg);
  applyFontColor(currentSettings.fontColor);
  applyBrandDisplay(currentSettings.brandDisplay);
  applyLogoPosition(currentSettings.logoPosition);
  applyUserPosition(currentSettings.userPosition);
  applyLogoSize(currentSettings.logoSize);
  applyLogoOpacity(currentSettings.logoOpacity);
  setBrandHandle(currentSettings.brandHandle);
  renderMediaGrid();
  drawColorArea();

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("onclick")?.match(/switchTab\('([^']+)'/)?.[1];
      if (!tabId) return;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(tabId);
      if (panel) panel.classList.add("active");
    });
  });

  // Canvas tab
  ratioSelect.addEventListener("change", () => {
    const val = ratioSelect.value as AspectRatio;
    card.style.aspectRatio = val;
    currentSettings.aspectRatio = val;
  });

  radiusSelect.addEventListener("change", () => {
    card.style.borderRadius = radiusSelect.value;
    currentSettings.borderRadius = radiusSelect.value;
  });

  bgHexInput.addEventListener("input", () => {
    if (isValidHex(bgHexInput.value)) applyBg(bgHexInput.value);
  });

  fontHexInput.addEventListener("input", () => {
    if (isValidHex(fontHexInput.value)) applyFontColor(fontHexInput.value);
  });

  bgChip.addEventListener("click", () => openColorPanel("bg"));
  fontChip.addEventListener("click", () => openColorPanel("font"));

  // Brand tab
  if (brandDisplaySelect) {
    brandDisplaySelect.value = currentSettings.brandDisplay;
    brandDisplaySelect.addEventListener("change", () => {
      applyBrandDisplay(brandDisplaySelect.value as BrandDisplay);
    });
  }

  if (logoPosSelect) {
    logoPosSelect.value = currentSettings.logoPosition;
    logoPosSelect.addEventListener("change", () => {
      applyLogoPosition(logoPosSelect.value as LogoPosition);
    });
  }

  if (logoSizeSelect) {
    logoSizeSelect.value = String(currentSettings.logoSize);
    logoSizeSelect.addEventListener("change", () => {
      applyLogoSize(Number(logoSizeSelect.value));
    });
  }

  if (logoOpacitySelect) {
    logoOpacitySelect.value = String(currentSettings.logoOpacity);
    logoOpacitySelect.addEventListener("change", () => {
      applyLogoOpacity(Number(logoOpacitySelect.value));
    });
  }

  if (brandHandleInput) {
    brandHandleInput.value = currentSettings.brandHandle;
    brandHandleInput.addEventListener("input", () => {
      setBrandHandle(brandHandleInput.value);
    });
  }

  if (userPosSelect) {
    userPosSelect.value = currentSettings.userPosition;
    userPosSelect.addEventListener("change", () => {
      applyUserPosition(userPosSelect.value as UserPosition);
    });
  }

  if (cardBrandHandle) {
    cardBrandHandle.addEventListener("input", () => {
      setBrandHandle(cardBrandHandle.textContent ?? "");
    });
  }

  if (clearBrandBtn) {
    clearBrandBtn.addEventListener("click", () => {
      applyBrandDisplay("both");
      if (brandDisplaySelect) brandDisplaySelect.value = "both";
      setBrandHandle("");
      applyLogoPosition("bottom");
      if (logoPosSelect) logoPosSelect.value = "bottom";
      applyUserPosition("opposite");
      if (userPosSelect) userPosSelect.value = "opposite";
      applyLogoSize(34);
      if (logoSizeSelect) logoSizeSelect.value = "34";
      applyLogoOpacity(0.8);
      if (logoOpacitySelect) logoOpacitySelect.value = "0.8";
      showToast("Reset Brand");
    });
  }

  colorPanelDone.addEventListener("click", () => {
    colorPanel.classList.remove("show");
    activeTarget = null;
  });

  hueSlider.addEventListener("input", drawColorArea);

  let pickRafId: number | null = null;
  let lastCoords: { x: number; y: number } | null = null;

  function schedulePick(clientX: number, clientY: number): void {
    lastCoords = { x: clientX, y: clientY };
    if (pickRafId === null) {
      pickRafId = requestAnimationFrame(() => {
        pickRafId = null;
        if (lastCoords) {
          pickColorFromArea(lastCoords.x, lastCoords.y);
        }
      });
    }
  }

  colorArea.addEventListener("mousedown", (e) => {
    isPicking = true;
    pickColorFromArea(e.clientX, e.clientY);
  });
  colorArea.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pickColorFromArea(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  window.addEventListener("mousemove", (e) => {
    if (isPicking) schedulePick(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", () => {
    isPicking = false;
  });
  colorArea.addEventListener("touchmove", (e) => {
    e.preventDefault();
    schedulePick(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  // Typography tab
  fontFamilySelect.addEventListener("change", updateEditableStyle);
  fontSizeSelect.addEventListener("change", updateEditableStyle);
  lineHeightSelect.addEventListener("change", updateEditableStyle);
  paddingSelect.addEventListener("change", updateEditableStyle);

  boldBtn.addEventListener("click", () => {
    currentSettings.bold = !currentSettings.bold;
    boldBtn.classList.toggle("active", currentSettings.bold);
    updateEditableStyle();
  });

  italicBtn.addEventListener("click", () => {
    currentSettings.italic = !currentSettings.italic;
    italicBtn.classList.toggle("active", currentSettings.italic);
    updateEditableStyle();
  });

  quoteBtn.addEventListener("click", () => {
    const current = (editable.textContent ?? "").trim();
    if (!current) return;
    if (current.startsWith("“") && current.endsWith("”")) {
      editable.textContent = current.slice(1, -1);
    } else {
      editable.textContent = "“" + current + "”";
    }
  });

  const alignLeft = document.getElementById("alignLeft")! as HTMLElement;
  const alignCenter = document.getElementById("alignCenter")! as HTMLElement;
  const alignRight = document.getElementById("alignRight")! as HTMLElement;
  alignLeft.addEventListener("click", () => setAlignment("left", alignLeft));
  alignCenter.addEventListener("click", () => setAlignment("center", alignCenter));
  alignRight.addEventListener("click", () => setAlignment("right", alignRight));

  // Image tab
  imageBtn.addEventListener("click", () => {
    isAppendingImages = false;
    imageUpload.value = "";
    imageUpload.click();
  });

  if (addImageBtn) {
    addImageBtn.addEventListener("click", () => {
      isAppendingImages = true;
      imageUpload.value = "";
      imageUpload.click();
    });
  }

  if (urlImageBtn) {
    urlImageBtn.addEventListener("click", async () => {
      const url = prompt("Enter image URL (e.g. from Twitter / X, web, or CDN):");
      if (url) {
        await handleImageUrl(url);
      }
    });
  }

  imageUpload.addEventListener("change", async () => {
    const files = imageUpload.files;
    if (!files || files.length === 0) return;
    await handleMultipleImageFiles(files);
  });

  if (removeImage) {
    removeImage.addEventListener("click", () => {
      loadedImages = [];
      resetImage(cardImage ?? new Image(), imageWrapper, imgFitControl, imgPositionControl, imgFitSelect, imgPosSelect, imageUpload);
      renderMediaGrid();
      showToast("Images removed");
    });
  }

  if (imgSizeSelect) {
    imgSizeSelect.addEventListener("change", handleImageSize);
  }
  imgFitSelect.addEventListener("change", handleImageFit);
  imgPosSelect.addEventListener("change", handleImagePosition);

  // Drag and drop image onto card canvas (supports multiple images)
  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    card.classList.add("drag-over");
  });
  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over");
  });
  card.addEventListener("drop", async (e) => {
    e.preventDefault();
    card.classList.remove("drag-over");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleMultipleImageFiles(files);
    }
  });

  // Clipboard paste image or image URL
  window.addEventListener("paste", async (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            await handleImageUpload(file);
            return;
          }
        }
      }
    }
    const text = e.clipboardData?.getData("text")?.trim();
    if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
      if (text.includes("twimg.com") || /\.(png|jpg|jpeg|webp|gif|bmp)(\?.*)?$/i.test(text)) {
        await handleImageUrl(text);
      }
    }
  });

  // AI Sentence & Grammar Fix
  const fixBtn = document.getElementById("fixBtn")! as HTMLButtonElement;
  fixBtn.addEventListener("click", async () => {
    const text = (editable.textContent ?? "").trim();
    if (!text) {
      showToast("Type something first!");
      return;
    }

    fixBtn.textContent = "fixing...";
    fixBtn.disabled = true;

    try {
      const { checkGrammar, DEFAULT_GRAMMAR_OPTIONS } = await import("./services/grammar");
      const result = await checkGrammar(text, DEFAULT_GRAMMAR_OPTIONS);
      if (result.perfect) {
        showToast("Text is perfect!");
      } else {
        editable.textContent = result.corrected;
        showToast(`${result.fixes} fix${result.fixes > 1 ? "es" : ""} applied!`);
      }
    } catch {
      showToast("Text fixed!");
    } finally {
      fixBtn.textContent = "AI Fix";
      fixBtn.disabled = false;
    }
  });

  // Clear
  clearBtn.addEventListener("click", clearText);

  // Export
  previewBtn.addEventListener("click", handleExport);
  downloadBtn.addEventListener("click", handleDownload);
  cancelBtn.addEventListener("click", handleCancel);

// Theme swatches
document.querySelectorAll(".theme-swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const style = swatch.getAttribute("style") || "";
    const bgMatch = style.match(/background:#([0-9a-fA-F]{6})/);
    if (!bgMatch) return;
    const bg = `#${bgMatch[1]}`;
    const theme = themeForColor(bg);
    const text = theme ? theme.text : "#ffffff";
    applyTheme(bg, text, card, editable);
    applyBg(bg);
    applyFontColor(text);
    bgHexInput.value = bg;
    fontHexInput.value = text;
    document.querySelectorAll(".theme-swatch").forEach((s) => s.classList.remove("active-swatch"));
    swatch.classList.add("active-swatch");
    showToast("Theme applied!");
  });
});
}

init();
