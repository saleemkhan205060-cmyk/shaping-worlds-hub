import { resolveStyle, getBgClass, getFontClass, getColorClass, getSizeClass } from "./TextPostStyles";

type Props = {
  text: string;
  style: unknown;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function TextPostCard({ text, style, className = "", size = "md" }: Props) {
  const s = resolveStyle(style);
  const bg = getBgClass(s.bgId);
  const font = getFontClass(s.fontId);
  const color = getColorClass(s.colorId);

  // Prefer explicit user-chosen size; fall back to length-based heuristic.
  const len = text.length;
  const fallbackSize =
    size === "lg"
      ? len > 140 ? "text-xl" : len > 80 ? "text-2xl" : len > 40 ? "text-3xl" : "text-4xl"
      : size === "sm"
        ? "text-sm"
        : len > 140 ? "text-base" : len > 80 ? "text-lg" : len > 40 ? "text-2xl" : "text-3xl";
  const textSize = s.sizeId ? getSizeClass(s.sizeId) : fallbackSize;

  const align =
    s.align === "left" ? "text-left" : s.align === "right" ? "text-right" : "text-center";

  return (
    <div
      className={`relative w-full aspect-square sm:aspect-[4/3] flex items-center justify-center px-6 py-8 ${bg} ${className}`}
    >
      <p
        className={`whitespace-pre-wrap break-words leading-snug ${font} ${color} ${textSize} ${align} drop-shadow-sm max-w-full`}
      >
        {text}
      </p>
    </div>
  );
}
