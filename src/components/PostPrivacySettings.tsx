import { useEffect, useRef, useState } from "react";
import { Globe2, Lock, SlidersHorizontal } from "lucide-react";

type PostPrivacySettingsProps = {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => void;
  accent?: "indigo" | "violet";
  align?: "left" | "right";
  label?: string;
};

const accentClasses = {
  indigo: {
    button: "focus:border-indigo-400 focus:ring-indigo-100",
    active: "border-indigo-500 bg-indigo-50 text-indigo-700",
  },
  violet: {
    button: "focus:border-violet-400 focus:ring-violet-100",
    active: "border-violet-500 bg-violet-50 text-violet-700",
  },
};

export function PostPrivacySettings({
  isPrivate,
  onChange,
  accent = "indigo",
  align = "left",
  label = "Post settings",
}: PostPrivacySettingsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colors = accentClasses[accent];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (nextPrivate: boolean) => {
    onChange(nextPrivate);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-4 ${colors.button}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <span className="inline-flex items-center gap-1">
          {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />}
          {isPrivate ? "Private" : "Public"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute bottom-full z-40 mb-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2 pb-2 pt-1 text-xs font-bold text-slate-500">Post settings</div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!isPrivate}
            onClick={() => choose(false)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              !isPrivate ? colors.active : "border-transparent text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Globe2 className="h-4 w-4" />
            Public
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={isPrivate}
            onClick={() => choose(true)}
            className={`mt-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              isPrivate ? colors.active : "border-transparent text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
        </div>
      ) : null}
    </div>
  );
}
