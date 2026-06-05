import { useState } from "react";
import { X, Loader2, Send, Globe2, Lock, Type } from "lucide-react";
import {
  BG_PRESETS,
  FONT_PRESETS,
  COLOR_PRESETS,
  DEFAULT_TEXT_STYLE,
  type TextStyle,
} from "./TextPostStyles";
import { TextPostCard } from "./TextPostCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string, style: TextStyle, isPrivate: boolean) => Promise<void> | void;
};

const MAX_LEN = 280;

export function TextPostComposer({ open, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [isPrivate, setIsPrivate] = useState(false);
  const [posting, setPosting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setText("");
    setStyle(DEFAULT_TEXT_STYLE);
    setIsPrivate(false);
  };

  const handleSubmit = async () => {
    const t = text.trim();
    if (!t) return;
    setPosting(true);
    try {
      await onSubmit(t, style, isPrivate);
      reset();
      onClose();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold">New text post</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <TextPostCard text={text || "Write something beautiful…"} style={style} />
          </div>
          <div className="mt-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              rows={2}
              maxLength={MAX_LEN}
              placeholder="What's on your mind?"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Text only · no media</span>
              <span>{text.length}/{MAX_LEN}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Background</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {BG_PRESETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setStyle((s) => ({ ...s, bgId: b.id }))}
                  className={`shrink-0 h-9 w-9 rounded-full border-2 ${b.className} ${
                    style.bgId === b.id ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white"
                  }`}
                  aria-label={b.label}
                  title={b.label}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Font</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FONT_PRESETS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStyle((s) => ({ ...s, fontId: f.id }))}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${f.className} ${
                    style.fontId === f.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Text color</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setStyle((s) => ({ ...s, colorId: c.id }))}
                  className={`shrink-0 h-8 w-8 rounded-full border-2 ${c.swatch} ${
                    style.colorId === c.id ? "border-indigo-600 ring-2 ring-indigo-200" : "border-slate-200"
                  }`}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Align</p>
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setStyle((s) => ({ ...s, align: a }))}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${
                    style.align === a
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />}
            {isPrivate ? "Private" : "Public"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={posting || !text.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
