import type { ReactNode } from "react";
import {
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  MessagesSquare,
  Music2,
  Send,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isNativeCapacitorApp, shareWithCapacitor, shareWithWebShare } from "@/lib/native-share";

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
  const canNativeShare = canUseNativeShareSheet();

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

  const moreApps = async () => {
    const data = { title, text, url, dialogTitle: "Share post" };
    const result = isNativeCapacitorApp()
      ? await shareWithCapacitor(data)
      : await (shareWithWebShare(data) ?? Promise.resolve("unavailable"));

    if (result === "shared") onClose();
    if (result === "failed" || result === "unavailable") {
      toast.error("Couldn't open share menu");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[360] bg-black/55 flex items-end justify-center"
      onClick={onClose}
    >
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

        <div className="grid grid-cols-4 gap-x-3 gap-y-4 pb-4">
          <ShareChoice
            label="WhatsApp"
            icon={<MessageCircle className="h-5 w-5" />}
            tone="bg-[#25D366] text-white"
            onClick={() => openShareUrl(`https://wa.me/?text=${encodedText}`)}
          />
          <ShareChoice
            label="Facebook"
            icon={<Facebook className="h-5 w-5" />}
            tone="bg-[#1877F2] text-white"
            onClick={() =>
              openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)
            }
          />
          <ShareChoice
            label="Messenger"
            icon={<MessagesSquare className="h-5 w-5" />}
            tone="bg-[#A334FA] text-white"
            onClick={() => openShareUrl(`fb-messenger://share?link=${encodedUrl}`)}
          />
          <ShareChoice
            label="Telegram"
            icon={<Send className="h-5 w-5" />}
            tone="bg-[#26A5E4] text-white"
            onClick={() =>
              openShareUrl(
                `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
              )
            }
          />
          <ShareChoice
            label="TikTok"
            icon={<Music2 className="h-5 w-5" />}
            tone="bg-slate-950 text-white"
            onClick={moreApps}
          />
          <ShareChoice
            label="X"
            icon={<span className="text-base font-black leading-none">𝕏</span>}
            tone="bg-slate-950 text-white"
            onClick={() => openShareUrl(`https://twitter.com/intent/tweet?text=${encodedText}`)}
          />
          <ShareChoice
            label="LinkedIn"
            icon={<Linkedin className="h-5 w-5" />}
            tone="bg-[#0A66C2] text-white"
            onClick={() =>
              openShareUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)
            }
          />
          <ShareChoice
            label="Email"
            icon={<Mail className="h-5 w-5" />}
            tone="bg-[#EA4335] text-white"
            onClick={() =>
              openShareUrl(`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`)
            }
          />
          <ShareChoice
            label="SMS"
            icon={<MessagesSquare className="h-5 w-5" />}
            tone="bg-[#34C759] text-white"
            onClick={() => openShareUrl(`sms:?&body=${encodedText}`)}
          />
          <ShareChoice
            label="Reddit"
            icon={<span className="text-sm font-black leading-none">r</span>}
            tone="bg-[#FF4500] text-white"
            onClick={() =>
              openShareUrl(
                `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`,
              )
            }
          />
          <ShareChoice
            label="Pinterest"
            icon={<span className="text-base font-black leading-none">P</span>}
            tone="bg-[#E60023] text-white"
            onClick={() =>
              openShareUrl(
                `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodeURIComponent(text)}`,
              )
            }
          />
          <ShareChoice
            label="Copy"
            icon={<Copy className="h-5 w-5" />}
            tone="bg-slate-100 text-slate-800"
            onClick={copyLink}
          />
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

function canUseNativeShareSheet() {
  return isNativeCapacitorApp() || (typeof navigator !== "undefined" && !!navigator.share);
}

function ShareChoice({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-2 text-slate-800"
    >
      <span
        className={`h-12 w-12 rounded-full flex items-center justify-center shadow-sm active:scale-95 ${tone}`}
      >
        {icon}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}
