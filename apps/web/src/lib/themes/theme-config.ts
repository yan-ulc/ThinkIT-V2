export type ThemeId =
  | "midnight-obsidian"
  | "cyberpunk"
  | "cyber-emerald"
  | "catppuccin"
  | "solar-dusk"
  | "oceanic-abyss";

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  accent: string;
  background: string;
  foreground: string;
  cardBg: string;
  cardBorder: string;
  glow: string;
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  previewColor: string;
  accentColor: string;
  bgColor: string;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  "midnight-obsidian": {
    id: "midnight-obsidian",
    name: "Midnight Obsidian",
    description: "Deep obsidian dark with electric violet neon highlights (Default)",
    previewColor: "#8b5cf6",
    accentColor: "#a78bfa",
    bgColor: "#09090b",
    colors: {
      primary: "#8b5cf6",
      primaryHover: "#7c3aed",
      accent: "#a78bfa",
      background: "#09090b",
      foreground: "#fafafa",
      cardBg: "rgba(15, 23, 42, 0.65)",
      cardBorder: "rgba(255, 255, 255, 0.08)",
      glow: "rgba(139, 92, 246, 0.35)",
      shades: {
        50: "#f5f3ff",
        100: "#ede9fe",
        200: "#ddd6fe",
        300: "#c4b5fd",
        400: "#a78bfa",
        500: "#8b5cf6",
        600: "#7c3aed",
        700: "#6d28d9",
        800: "#5b21b6",
        900: "#4c1d95",
        950: "#2e1065",
      },
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "High-contrast electric magenta with dark violet obsidian",
    previewColor: "#ff00c8",
    accentColor: "#00f0ff",
    bgColor: "#0c0c1d",
    colors: {
      primary: "#ff00c8",
      primaryHover: "#db00ad",
      accent: "#00f0ff",
      background: "#0c0c1d",
      foreground: "#fdf4ff",
      cardBg: "rgba(20, 15, 38, 0.7)",
      cardBorder: "rgba(255, 0, 200, 0.15)",
      glow: "rgba(255, 0, 200, 0.35)",
      shades: {
        50: "#fdf2f8",
        100: "#fce7f3",
        200: "#fbcfe8",
        300: "#f472b6",
        400: "#ff36d9",
        500: "#ff00c8",
        600: "#db00ad",
        700: "#b3008d",
        800: "#8a006c",
        900: "#6b0054",
        950: "#3d0030",
      },
    },
  },
  "cyber-emerald": {
    id: "cyber-emerald",
    name: "Cyber Emerald",
    description: "Supabase-inspired emerald glow on dark matrix forest",
    previewColor: "#10b981",
    accentColor: "#72e3ad",
    bgColor: "#09140f",
    colors: {
      primary: "#10b981",
      primaryHover: "#059669",
      accent: "#72e3ad",
      background: "#09140f",
      foreground: "#f0fdf4",
      cardBg: "rgba(13, 28, 20, 0.7)",
      cardBorder: "rgba(16, 185, 129, 0.15)",
      glow: "rgba(16, 185, 129, 0.35)",
      shades: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#10b981",
        600: "#059669",
        700: "#047857",
        800: "#065f46",
        900: "#064e3b",
        950: "#022c22",
      },
    },
  },
  catppuccin: {
    id: "catppuccin",
    name: "Catppuccin Mocha",
    description: "Developer favorite soft lavender mauve on velvety slate",
    previewColor: "#cba6f7",
    accentColor: "#89b4fa",
    bgColor: "#181825",
    colors: {
      primary: "#cba6f7",
      primaryHover: "#b48bf2",
      accent: "#89b4fa",
      background: "#181825",
      foreground: "#cdd6f4",
      cardBg: "rgba(30, 30, 46, 0.75)",
      cardBorder: "rgba(203, 166, 247, 0.15)",
      glow: "rgba(203, 166, 247, 0.35)",
      shades: {
        50: "#faf5ff",
        100: "#f3e8ff",
        200: "#e9d5ff",
        300: "#d8b4fe",
        400: "#cba6f7",
        500: "#8839ef",
        600: "#772be2",
        700: "#651fc8",
        800: "#5318a6",
        900: "#431484",
        950: "#280a54",
      },
    },
  },
  "solar-dusk": {
    id: "solar-dusk",
    name: "Solar Dusk",
    description: "Warm copper ember and desert sunset on charcoal stone",
    previewColor: "#f97316",
    accentColor: "#f59e0b",
    bgColor: "#171412",
    colors: {
      primary: "#f97316",
      primaryHover: "#ea580c",
      accent: "#f59e0b",
      background: "#171412",
      foreground: "#fff7ed",
      cardBg: "rgba(32, 23, 18, 0.75)",
      cardBorder: "rgba(249, 115, 22, 0.15)",
      glow: "rgba(249, 115, 22, 0.35)",
      shades: {
        50: "#fff7ed",
        100: "#ffedd5",
        200: "#fed7aa",
        300: "#fdba74",
        400: "#fb923c",
        500: "#f97316",
        600: "#ea580c",
        700: "#c2410c",
        800: "#9a3412",
        900: "#7c2d12",
        950: "#431407",
      },
    },
  },
  "oceanic-abyss": {
    id: "oceanic-abyss",
    name: "Oceanic Abyss",
    description: "Vibrant cyan & aquamarine on deep midnight oceanic trench",
    previewColor: "#38bdf8",
    accentColor: "#34d399",
    bgColor: "#071324",
    colors: {
      primary: "#38bdf8",
      primaryHover: "#0284c7",
      accent: "#34d399",
      background: "#071324",
      foreground: "#f0f9ff",
      cardBg: "rgba(11, 26, 48, 0.75)",
      cardBorder: "rgba(56, 189, 248, 0.15)",
      glow: "rgba(56, 189, 248, 0.35)",
      shades: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0284c7",
        600: "#0369a1",
        700: "#075985",
        800: "#0c4a6e",
        900: "#082f49",
        950: "#041c2c",
      },
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = "midnight-obsidian";

export const THEMES_LIST: ThemeConfig[] = Object.values(THEMES);
