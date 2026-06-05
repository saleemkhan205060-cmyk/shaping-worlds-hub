// Shared style presets for text-only posts

export type TextStyle = {
  bgId: string;
  fontId: string;
  colorId: string;
  align?: "left" | "center" | "right";
  sizeId?: string;
};


export type BgPreset = {
  id: string;
  label: string;
  className: string; // tailwind background classes
};

export const BG_PRESETS: BgPreset[] = [
  { id: "indigo", label: "Indigo", className: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" },
  { id: "sunset", label: "Sunset", className: "bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-600" },
  { id: "ocean", label: "Ocean", className: "bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-700" },
  { id: "forest", label: "Forest", className: "bg-gradient-to-br from-emerald-400 via-teal-500 to-green-700" },
  { id: "peach", label: "Peach", className: "bg-gradient-to-br from-amber-200 via-rose-200 to-pink-300" },
  { id: "noir", label: "Noir", className: "bg-gradient-to-br from-slate-900 via-zinc-800 to-black" },
  { id: "gold", label: "Gold", className: "bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600" },
  { id: "candy", label: "Candy", className: "bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-600" },
  { id: "mint", label: "Mint", className: "bg-gradient-to-br from-lime-300 via-emerald-400 to-teal-500" },
  { id: "paper", label: "Paper", className: "bg-white" },
  { id: "ink", label: "Ink", className: "bg-slate-900" },
  { id: "rose", label: "Rose", className: "bg-rose-500" },
];

export type FontPreset = {
  id: string;
  label: string;
  className: string;
};

export const FONT_PRESETS: FontPreset[] = [
  { id: "sans", label: "Modern", className: "font-sans font-extrabold tracking-tight" },
  { id: "serif", label: "Editorial", className: "font-serif italic font-semibold" },
  { id: "mono", label: "Mono", className: "font-mono font-bold tracking-tight" },
  { id: "display", label: "Display", className: "font-sans font-black tracking-tighter uppercase" },
  { id: "soft", label: "Soft", className: "font-sans font-medium tracking-wide" },
];

export type ColorPreset = {
  id: string;
  label: string;
  className: string; // text color
  swatch: string; // bg color used in picker swatch
};

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "white", label: "White", className: "text-white", swatch: "bg-white" },
  { id: "black", label: "Black", className: "text-slate-900", swatch: "bg-slate-900" },
  { id: "yellow", label: "Yellow", className: "text-yellow-300", swatch: "bg-yellow-300" },
  { id: "rose", label: "Rose", className: "text-rose-500", swatch: "bg-rose-500" },
  { id: "indigo", label: "Indigo", className: "text-indigo-600", swatch: "bg-indigo-600" },
  { id: "emerald", label: "Emerald", className: "text-emerald-400", swatch: "bg-emerald-400" },
  { id: "amber", label: "Amber", className: "text-amber-400", swatch: "bg-amber-400" },
  { id: "sky", label: "Sky", className: "text-sky-300", swatch: "bg-sky-300" },
];

export const DEFAULT_TEXT_STYLE: TextStyle = {
  bgId: "indigo",
  fontId: "sans",
  colorId: "white",
  align: "center",
};

export function resolveStyle(raw: unknown): TextStyle {
  const s = (raw && typeof raw === "object" ? (raw as Partial<TextStyle>) : {}) as Partial<TextStyle>;
  return {
    bgId: BG_PRESETS.some((b) => b.id === s.bgId) ? s.bgId! : DEFAULT_TEXT_STYLE.bgId,
    fontId: FONT_PRESETS.some((f) => f.id === s.fontId) ? s.fontId! : DEFAULT_TEXT_STYLE.fontId,
    colorId: COLOR_PRESETS.some((c) => c.id === s.colorId) ? s.colorId! : DEFAULT_TEXT_STYLE.colorId,
    align: s.align === "left" || s.align === "right" ? s.align : "center",
  };
}

export function getBgClass(id: string) {
  return BG_PRESETS.find((b) => b.id === id)?.className ?? BG_PRESETS[0].className;
}
export function getFontClass(id: string) {
  return FONT_PRESETS.find((f) => f.id === id)?.className ?? FONT_PRESETS[0].className;
}
export function getColorClass(id: string) {
  return COLOR_PRESETS.find((c) => c.id === id)?.className ?? COLOR_PRESETS[0].className;
}
