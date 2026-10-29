export interface Theme {
  name: string;
  bg: string;
  text: string;
  color: string;
}

export const PRESET_THEMES: Theme[] = [
  { name: "Black", bg: "#000000", text: "#ffffff", color: "#000000" },
  { name: "White", bg: "#f9fafb", text: "#111827", color: "#f9fafb" },
  { name: "Slate", bg: "#0f172a", text: "#f8fafc", color: "#0f172a" },
  { name: "Zinc", bg: "#18181b", text: "#f4f4f5", color: "#18181b" },
  { name: "Emerald", bg: "#064e3b", text: "#ecfdf5", color: "#064e3b" },
  { name: "Maroon", bg: "#450a0a", text: "#fef2f2", color: "#450a0a" },
  { name: "Navy", bg: "#1e3a8a", text: "#eff6ff", color: "#1e3a8a" },
  { name: "Indigo", bg: "#312e81", text: "#eef2ff", color: "#312e81" },
  { name: "Teal", bg: "#0f4c5c", text: "#ecfeff", color: "#0f4c5c" },
  { name: "Amber", bg: "#451a03", text: "#fffbeb", color: "#451a03" },
  { name: "Rose", bg: "#4c0519", text: "#fff1f2", color: "#4c0519" },
  { name: "Forest", bg: "#14532d", text: "#f0fdf4", color: "#14532d" },
  { name: "Charcoal", bg: "#171717", text: "#f5f5f5", color: "#171717" },
];

export function applyTheme(bg: string, text: string, card: HTMLElement, editable: HTMLElement): void {
  card.style.backgroundColor = bg;
  editable.style.color = text;
}

export function themeForColor(color: string): Theme | undefined {
  return PRESET_THEMES.find((t) => t.color === color.toLowerCase());
}
