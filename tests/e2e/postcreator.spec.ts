import { test, expect } from "@playwright/test";
import * as fs from "fs";

const SMALL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function openPreview(page: any) {
  await page.locator("#previewBtn").click();
  await expect(page.locator("#popup")).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator("#popupImage")).toHaveAttribute("src", /.+/, { timeout: 30000 });
  return page.locator("#popup");
}

async function editableText(page: any): Promise<string> {
  return page.locator("#editable").evaluate((el: Element) => (el as HTMLElement).textContent ?? "");
}

function parsePngDimensions(buf: Buffer): { width: number; height: number } {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

test("page loads without uncaught JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await expect(page.locator("#editable")).toBeVisible();
  expect(errors).toEqual([]);
});

test("text formatting and alignment update the preview", async ({ page }) => {
  await page.goto("/");
  await page.locator('button:has-text("Typography")').click();
  const editable = page.locator("#editable");
  await editable.click();
  await editable.fill("Hello world");
  await expect(await editableText(page)).toBe("Hello world");

  await page.locator("#boldBtn").click();
  await expect(editable).toHaveCSS("font-weight", "700");

  await page.locator("#italicBtn").click();
  await expect(editable).toHaveCSS("font-style", "italic");

  await page.locator("#alignLeft").click();
  await expect(editable).toHaveCSS("text-align", "left");
});

test("font family and size change the editable style", async ({ page }) => {
  await page.goto("/");
  await page.locator('button:has-text("Typography")').click();
  await page.locator("#fontFamily").selectOption("Poppins");
  const family = await page.locator("#editable").evaluate((el: Element) => (el as HTMLElement).style.fontFamily);
  expect(family).toContain("Poppins");
  await page.locator("#fontSize").selectOption("32");
  await expect(page.locator("#editable")).toHaveCSS("font-size", "32px");
});

test("theme and color changes work", async ({ page }) => {
  await page.goto("/");
  await page.locator(".theme-swatch").first().click();
  await expect(page.locator("#card")).toHaveCSS("background-color", "rgb(0, 0, 0)");

  await page.locator("#bgHex").fill("#123456");
  await page.locator("#bgHex").press("Enter");
  await expect(page.locator("#card")).toHaveCSS("background-color", "rgb(18, 52, 86)");
});

test("clear text functionality", async ({ page }) => {
  await page.goto("/");
  const editable = page.locator("#editable");
  await editable.click();
  await editable.fill("Some text");
  await page.locator("#clearBtn").click();
  await expect(await editableText(page)).toBe("");
});

test("uploaded image can be added and removed", async ({ page }) => {
  await page.goto("/");
  const imageInput = page.locator("#imageUpload");
  await imageInput.setInputFiles([
    {
      name: "small.png",
      mimeType: "image/png",
      buffer: Buffer.from(SMALL_PNG_BASE64, "base64"),
    },
  ]);
  await expect(page.locator("#imageWrapper")).toHaveClass(/has-image/);
  await page.locator("#removeImage").click();
  await expect(page.locator("#imageWrapper")).not.toHaveClass(/has-image/);
});

test("image positioning, size, and fit settings work", async ({ page }) => {
  await page.goto("/");
  await page.locator('.tab-btn:has-text("Image")').click();
  const imageInput = page.locator("#imageUpload");
  await imageInput.setInputFiles([
    {
      name: "small.png",
      mimeType: "image/png",
      buffer: Buffer.from(SMALL_PNG_BASE64, "base64"),
    },
  ]);
  await expect(page.locator("#imageWrapper")).toHaveClass(/has-image/);
  await page.locator("#imgPosSelect").selectOption("above");
  await page.locator("#imgFitSelect").selectOption("cover");
  await expect(page.locator("#cardImage")).toHaveCSS("object-fit", "cover");

  // Verify image size control
  const sizeControl = page.locator("#imgSizeControl");
  await expect(sizeControl).toBeVisible();
  const sizeSelect = page.locator("#imgSizeSelect");
  await sizeSelect.selectOption("35");
  await expect(page.locator("#cardImage")).toHaveCSS("max-width", "35%");
  await sizeSelect.selectOption("80");
  await expect(page.locator("#cardImage")).toHaveCSS("max-width", "80%");
});

test("Twitter/X multi-image grid (1, 2, 3, 4 images) works", async ({ page }) => {
  await page.goto("/");
  await page.locator('.tab-btn:has-text("Image")').click();

  const filePayload = (name: string) => ({
    name,
    mimeType: "image/png",
    buffer: Buffer.from(SMALL_PNG_BASE64, "base64"),
  });

  const imageInput = page.locator("#imageUpload");
  const wrapper = page.locator("#imageWrapper");

  // 1 image -> grid-1
  await imageInput.setInputFiles([filePayload("img1.png")]);
  await expect(wrapper).toHaveClass(/grid-1/);
  await expect(page.locator(".x-media-cell")).toHaveCount(1);

  // 2 images -> grid-2
  await imageInput.setInputFiles([filePayload("img1.png"), filePayload("img2.png")]);
  await expect(wrapper).toHaveClass(/grid-2/);
  await expect(page.locator(".x-media-cell")).toHaveCount(2);

  // 3 images -> grid-3
  await imageInput.setInputFiles([filePayload("img1.png"), filePayload("img2.png"), filePayload("img3.png")]);
  await expect(wrapper).toHaveClass(/grid-3/);
  await expect(page.locator(".x-media-cell")).toHaveCount(3);

  // 4 images -> grid-4
  await imageInput.setInputFiles([
    filePayload("img1.png"),
    filePayload("img2.png"),
    filePayload("img3.png"),
    filePayload("img4.png"),
  ]);
  await expect(wrapper).toHaveClass(/grid-4/);
  await expect(page.locator(".x-media-cell")).toHaveCount(4);

  // Remove one image -> returns to 3 images (grid-3)
  await page.locator('.remove-media-item[data-index="1"]').click();
  await expect(wrapper).toHaveClass(/grid-3/);
  await expect(page.locator(".x-media-cell")).toHaveCount(3);
});

test("export preview opens successfully", async ({ page }) => {
  await page.goto("/");
  await page.locator("#editable").click();
  await page.locator("#editable").fill("Export test");
  const popup = await openPreview(page);
  await popup.locator("#cancelBtn").click();
  await expect(page.locator("#popup")).not.toHaveClass(/show/);
});

test("PNG download has expected MIME type and dimensions", async ({ page }) => {
  await page.goto("/");
  await page.locator("#editable").click();
  await page.locator("#editable").fill("Download test");
  await openPreview(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#downloadBtn").click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buf = fs.readFileSync(path!);
  expect(download.suggestedFilename().endsWith(".png")).toBe(true);
  const { width, height } = parsePngDimensions(buf);
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  expect(width).toBeGreaterThanOrEqual(1080);

  await page.locator("#cancelBtn").click();
  await expect(page.locator("#popup")).not.toHaveClass(/show/);
});

test("closing the preview returns to the editor", async ({ page }) => {
  await page.goto("/");
  await page.locator("#editable").click();
  await page.locator("#editable").fill("Close test");
  const popup = await openPreview(page);
  await popup.locator("#cancelBtn").click();
  await expect(page.locator("#editable")).toBeVisible();
  await expect(await editableText(page)).toBe("Close test");
  await expect(page.locator("#popup")).not.toHaveClass(/show/);
});

test("repeated exports do not break the app", async ({ page }) => {
  await page.goto("/");
  await page.locator("#editable").click();
  await page.locator("#editable").fill("Repeat export");
  for (let i = 0; i < 3; i++) {
    const popup = await openPreview(page);
    await popup.locator("#cancelBtn").click();
    await expect(page.locator("#previewBtn")).not.toBeDisabled();
  }
});

test("mobile viewport interactions remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("#editable")).toBeVisible();
  await page.locator("#editable").click();
  await page.locator("#editable").fill("Mobile test");
  await expect(await editableText(page)).toBe("Mobile test");
  const popup = await openPreview(page);
  await popup.locator("#cancelBtn").click();
});

test("aspect ratio selection changes card shape", async ({ page }) => {
  await page.goto("/");
  await page.locator("#ratioSelect").selectOption("16 / 9");
  await expect(page.locator("#card")).toHaveCSS("aspect-ratio", "16 / 9");
});

test("brand logo renders, has no shadows, and adapts dynamically to base colors and palettes", async ({ page }) => {
  await page.goto("/");

  // Check original app header brand (PostCreator Pro)
  const brand = page.locator(".app-header .brand");
  await expect(brand).toBeVisible();
  await expect(brand).toContainText("PostCreator");

  // Check card logo default (Black theme -> BBOG-white.png anchored to canvas bottom)
  const cardLogo = page.locator("#cardLogo");
  await expect(cardLogo).toBeVisible();
  await expect(cardLogo).toHaveAttribute("src", /BBOG-white/);
  // Verify NO shadow on card logo
  await expect(cardLogo).toHaveCSS("filter", "none");

  // Verify it is anchored to canvas bottom, NOT hugging text
  const wrapper = page.locator("#cardLogoWrapper");
  await expect(wrapper).toHaveCSS("position", "absolute");
  await expect(wrapper).toHaveClass(/pos-bottom/);

  // Switch to White theme palette (second swatch, #f9fafb)
  const whiteSwatch = page.locator('.theme-swatch[style*="background:#f9fafb"]');
  await whiteSwatch.click();
  await expect(page.locator("#card")).toHaveCSS("background-color", "rgb(249, 250, 251)");
  // Logo must automatically adapt to high-contrast BBOG-Black.png
  await expect(cardLogo).toHaveAttribute("src", /BBOG-Black/);

  // Switch to a dark theme palette (Onyx Black)
  const darkSwatch = page.locator('.theme-swatch[style*="background:#000000"]');
  await darkSwatch.click();
  await expect(page.locator("#card")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  // Logo must switch back to BBOG-white.png
  await expect(cardLogo).toHaveAttribute("src", /BBOG-white/);

  // Switch to Brand Tab
  await page.locator('.tab-btn:has-text("Brand")').click();

  // Test logo position controls
  const logoPos = page.locator("#logoPosSelect");

  await logoPos.selectOption("bottom-right");
  await expect(wrapper).toHaveClass(/pos-bottom-right/);

  await logoPos.selectOption("bottom");
  await expect(wrapper).toHaveClass(/pos-bottom/);

  await logoPos.selectOption("hide");
  await expect(wrapper).not.toBeVisible();

  await logoPos.selectOption("bottom");
  await expect(wrapper).toBeVisible();

  // Test logo size control (34 max, with smaller options like 24px)
  const logoSize = page.locator("#logoSizeSelect");
  await logoSize.selectOption("24");
  await expect(cardLogo).toHaveCSS("height", "24px");
  await logoSize.selectOption("34");
  await expect(cardLogo).toHaveCSS("height", "34px");

  // Test logo opacity control
  const logoOpacity = page.locator("#logoOpacitySelect");
  await logoOpacity.selectOption("0.6");
  await expect(cardLogo).toHaveCSS("opacity", "0.6");

  // Test brand handle input
  const handleInput = page.locator("#brandHandleInput");
  const brandHandle = page.locator("#cardBrandHandle");
  await handleInput.fill("@myinstagram");
  await expect(brandHandle).toBeVisible();
  await expect(brandHandle).toHaveText("@myinstagram");

  // Test username position relative to logo
  const userPos = page.locator("#userPosSelect");
  await userPos.selectOption("below");
  await expect(wrapper).toHaveClass(/user-pos-below/);
  await userPos.selectOption("left");
  await expect(wrapper).toHaveClass(/user-pos-left/);
  await userPos.selectOption("right");
  await expect(wrapper).toHaveClass(/user-pos-right/);
  await userPos.selectOption("opposite");
  await expect(wrapper).toHaveClass(/user-pos-opposite/);

  // When logo is bottom-right and user is opposite, username is in left corner and logo in right corner
  await logoPos.selectOption("bottom-right");
  const logoBox = await cardLogo.boundingBox();
  const handleBox = await brandHandle.boundingBox();
  expect(handleBox!.x).toBeLessThan(logoBox!.x);
  await logoPos.selectOption("bottom");

  // Test display modes: Logo Only / User Only / Logo + User
  const brandDisplay = page.locator("#brandDisplaySelect");
  
  // 1. Logo Only
  await brandDisplay.selectOption("logo");
  await expect(cardLogo).toBeVisible();
  await expect(brandHandle).not.toBeVisible();

  // 2. User Only
  await brandDisplay.selectOption("username");
  await expect(cardLogo).not.toBeVisible();
  await expect(brandHandle).toBeVisible();

  // 3. Logo + User (Both)
  await brandDisplay.selectOption("both");
  await expect(cardLogo).toBeVisible();
  await expect(brandHandle).toBeVisible();

  // Test Reset button
  await page.locator("#clearBrandBtn").click();
  await expect(brandHandle).not.toBeVisible();
  await expect(wrapper).toBeVisible();
});
