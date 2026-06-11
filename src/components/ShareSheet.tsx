import type { ReactNode } from "react";
import { Copy, Facebook, MessageCircle, Send, Share2, X } from "lucide-react";
import { toast } from "sonner";

type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
};

export function ShareSheet({ open, onClose, title, text, url }: ShareSheetProps) {
  if (!open) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`.trim());
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const openShareUrl = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      onClose();
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const moreApps = () => {
    navigator
      .share?.({ title, text, url })
      .then(onClose)
      .catch((err) => {
        if (err?.name !== "AbortError") toast.error("Couldn't open share menu");
      });
  };

  return (
    <div className="fixed inset-0 z-[360] bg-black/55 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-base font-bold text-slate-900">Share</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center active:bg-slate-200"
            aria-label="Close share menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 pb-4">
          <ShareChoice
            label="WhatsApp"
            icon={<MessageCircle className="h-5 w-5" />}
            onClick={() => openShareUrl(`https://wa.me/?text=${encodedText}`)}
          />
          <ShareChoice
            label="Facebook"
            icon={<Facebook className="h-5 w-5" />}
            onClick={() => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
          />
          <ShareChoice
            label="Telegram"
            icon={<Send className="h-5 w-5" />}
            onClick={() => openShareUrl(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`)}
          />
          <ShareChoice label="Copy" icon={<Copy className="h-5 w-5" />} onClick={copyLink} />
        </div>

        {canNativeShare && (
          <button
            type="button"
            onClick={moreApps}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white active:bg-slate-800"
          >
            <Share2 className="h-4 w-4" />
            More apps
          </button>
        )}
      </div>
    </div>
  );
}

function ShareChoice({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 flex-col items-center gap-2 text-slate-800">
      <span className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200">
        {icon}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium leading-tight">{label}</span>
    </button>
  );
}