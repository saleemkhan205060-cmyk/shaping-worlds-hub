import { ReactNode, useRef, useState } from "react";
import { Share2, Flag, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ShareSheet } from "@/components/ShareSheet";
import { EditPostDialog } from "@/components/EditPostDialog";
import { buildShareUrl, shareWithSystemShare } from "@/lib/native-share";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
    const url = ownerId ? buildShareUrl(`/u/${ownerId}`) : buildShareUrl("/");
    const data = {
      title: caption ?? t("media.post"),
      text: caption ?? t("media.checkThisOut"),
      url,
      dialogTitle: t("share.post"),
    };

    const systemShare = shareWithSystemShare(data);
    if (!systemShare) {
      setOpen(false);
      setShareOpen(true);
      return;
    }
    systemShare.then((result) => {
      setOpen(false);
      if (result === "failed" || result === "unavailable") setShareOpen(true);
    });
  };

  const handleReport = async () => {
    setOpen(false);
    if (!user) {
      toast.error(t("media.reportSignIn"));
      return;
    }
    const { error } = await supabase
      .from("post_reports")
      .insert({ post_id: postId, reporter_id: user.id });
    if (error && error.code !== "23505") {
      console.error("Report error:", error);
      toast.error(t("media.reportFailed"));
    } else {
      toast.success(t("media.reportThanks"));
    }
  };

  const handleDelete = async () => {
    setOpen(false);
    if (!isOwner) return;
    if (!confirm(t("media.deleteConfirm"))) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      console.error("Delete error:", error);
      toast.error(t("media.deleteFailed"));
    } else {
      toast.success(t("media.deleted"));
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
            <Item icon={<Share2 className="h-5 w-5" />} label={t("common.share")} onClick={handleShare} />
            {isOwner && (
              <Item
                icon={<Pencil className="h-5 w-5" />}
                label={t("common.edit")}
                onClick={() => {
                  setOpen(false);
                  setEditOpen(true);
                }}
              />
            )}
            <Item icon={<Flag className="h-5 w-5" />} label={t("common.report")} onClick={handleReport} />
            {isOwner && (
              <Item
                icon={<Trash2 className="h-5 w-5" />}
                label={t("common.delete")}
                danger
                onClick={handleDelete}
              />
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 text-sm font-semibold text-slate-600 border-t border-slate-100 active:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={caption ?? t("media.post")}
        text={caption ?? t("media.checkThisOut")}
        url={ownerId ? buildShareUrl(`/u/${ownerId}`) : buildShareUrl("/")}
      />
      <EditPostDialog
        postId={postId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
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
