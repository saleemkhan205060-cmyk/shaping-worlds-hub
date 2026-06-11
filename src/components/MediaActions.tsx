import { ReactNode, useRef, useState } from "react";
import { Share2, Flag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ShareSheet } from "@/components/ShareSheet";
import { isNativeCapacitorApp, shareWithCapacitor, shareWithWebShare } from "@/lib/native-share";

type Props = {
  postId: string;
  ownerId?: string | null;
  mediaUrl: string;
  caption?: string | null;
  /** Called after the post is successfully deleted, so parents can prune local state. */
  onDeleted?: (id: string) => void;
  /** Optional className for the wrapper span. */
  className?: string;
  children: ReactNode;
};

/**
 * Wraps an <img>/<video> so a long-press (touch) or right-click (desktop)
 * opens a custom action sheet with Share / Report / Delete instead of the
 * native "Copy image / Download / Open in Chrome" menu.
 */
export function MediaActions({
  postId,
  ownerId,
  mediaUrl,
  caption,
  onDeleted,
  className,
  children,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const moved = useRef(false);

  const isOwner = !!user && !!ownerId && user.id === ownerId;

  const clearTimer = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handleTouchStart = () => {
    moved.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      if (!moved.current) {
        try {
          if ("vibrate" in navigator) navigator.vibrate(15);
        } catch {
          // Vibration is optional and may be blocked by the browser.
        }
        setOpen(true);
      }
    }, 450);
  };

  const handleShare = () => {
    setOpen(false);
    const url = mediaUrl || window.location.href;
    const data = {
      title: caption ?? "Post",
      text: caption ?? "Check this out",
      url,
      dialogTitle: "Share post",
    };

    if (isNativeCapacitorApp()) {
      shareWithCapacitor(data).then((result) => {
        if (result === "failed" || result === "unavailable") setShareOpen(true);
      });
      return;
    }

    const webShare = shareWithWebShare(data);
    if (webShare) {
      webShare.then((result) => {
        if (result === "failed" || result === "unavailable") setShareOpen(true);
      });
      return;
    }

    setShareOpen(true);
  };

  const handleReport = async () => {
    setOpen(false);
    if (!user) {
      toast.error("Please sign in to report");
      return;
    }
    const { error } = await supabase
      .from("post_reports")
      .insert({ post_id: postId, reporter_id: user.id });
    if (error && error.code !== "23505") {
      console.error("Report error:", error);
      toast.error("Couldn't submit report. Please try again.");
    } else {
      toast.success("Thanks — we'll review this post");
    }
  };

  const handleDelete = async () => {
    setOpen(false);
    if (!isOwner) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      console.error("Delete error:", error);
      toast.error("Couldn't delete. Please try again.");
    } else {
      toast.success("Post deleted");
      onDeleted?.(postId);
    }
  };

  return (
    <>
      <span
        className={`media-actions ${className ?? ""}`}
        style={{ display: "contents" }}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={clearTimer}
        onTouchMove={() => {
          moved.current = true;
          clearTimer();
        }}
        onTouchCancel={clearTimer}
      >
        {children}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Item icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
            <Item icon={<Flag className="h-5 w-5" />} label="Report" onClick={handleReport} />
            {isOwner && (
              <Item
                icon={<Trash2 className="h-5 w-5" />}
                label="Delete"
                danger
                onClick={handleDelete}
              />
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 text-sm font-semibold text-slate-600 border-t border-slate-100 active:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={caption ?? "Post"}
        text={caption ?? "Check this out"}
        url={mediaUrl || window.location.href}
      />
    </>
  );
}

function Item({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold border-b border-slate-100 active:bg-slate-100 ${
        danger ? "text-rose-600" : "text-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
