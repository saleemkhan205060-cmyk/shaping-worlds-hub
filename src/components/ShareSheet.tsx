import { useEffect, useState, type ReactNode } from "react";
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
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { canUseSystemShare, shareWithSystemShare } from "@/lib/native-share";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
};

type Friend = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export function ShareSheet({ open, onClose, title, text, url }: ShareSheetProps) {
  // Read the identity from the shared in-memory session instead of a network
  // getUser() call, which blocks on the Supabase auth lock and can hang.
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
  const [sendingTo, setSendingTo] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFriends = friends.filter((f) => {
    if (!normalizedSearch) return true;
    const name = (f.display_name || "").toLowerCase();
    const user = (f.username || "").toLowerCase();
    return name.includes(normalizedSearch) || user.includes(normalizedSearch);
  });

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSentTo({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFriends(true);
      try {
        const uid = user?.id;
        if (!uid) {
          if (!cancelled) setFriends([]);
          return;
        }
        const { data: following } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", uid)
          .limit(50);
        const ids = (following ?? []).map((f) => f.following_id);
        if (ids.length === 0) {
          if (!cancelled) setFriends([]);
          return;
        }
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", ids);
        if (!cancelled) setFriends((profs as Friend[]) ?? []);
      } finally {
        if (!cancelled) setLoadingFriends(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  if (!open) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`.trim());
  const canNativeShare = canUseSystemShare();

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
    const result = await (shareWithSystemShare(data) ?? Promise.resolve("unavailable"));

    if (result === "shared") onClose();
    if (result === "failed" || result === "unavailable") {
      toast.error("Couldn't open share menu");
    }
  };

  const sendToFriend = async (friend: Friend) => {
    if (sendingTo[friend.id] || sentTo[friend.id]) return;
    setSendingTo((s) => ({ ...s, [friend.id]: true }));
    try {
      const uid = user?.id;
      if (!uid) {
        toast.error("Please sign in to share");
        return;
      }
      const content = `${text ? text + "\n" : ""}${url}`.slice(0, 2000);
      const { error } = await supabase.from("messages").insert({
        sender_id: uid,
        recipient_id: friend.id,
        content,
      });
      if (error) {
        toast.error("Couldn't send");
        return;
      }
      setSentTo((s) => ({ ...s, [friend.id]: true }));
      toast.success(`Sent to ${friend.display_name || friend.username || "friend"}`);
    } finally {
      setSendingTo((s) => ({ ...s, [friend.id]: false }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[360] bg-black/55 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
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

        {/* Friends row (in-app sharing) */}
        <div className="pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 pb-2">
            Send to
          </p>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full h-10 pl-9 pr-9 rounded-full bg-slate-100 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {loadingFriends ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading friends…
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              {searchQuery ? "No friends found." : "Follow people to send them posts directly."}
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {filteredFriends.map((friend) => {
                const name = friend.display_name || friend.username || "User";
                const initial = name.trim().charAt(0).toUpperCase();
                const isSent = !!sentTo[friend.id];
                const isSending = !!sendingTo[friend.id];
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => sendToFriend(friend)}
                    className="flex shrink-0 w-16 flex-col items-center gap-1.5 text-slate-800"
                  >
                    <span className="relative h-14 w-14 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 font-semibold shadow-sm active:scale-95">
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initial}</span>
                      )}
                      {(isSending || isSent) && (
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                          {isSending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[11px] font-medium leading-tight">
                      {isSent ? "Sent" : name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-100 my-1" />

        <div className="grid grid-cols-4 gap-x-3 gap-y-4 pt-3 pb-4">
          {canNativeShare && (
            <ShareChoice
              label="More apps"
              icon={<Share2 className="h-5 w-5" />}
              tone="bg-slate-900 text-white"
              onClick={moreApps}
            />
          )}
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
            onClick={moreApps}
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
      </div>
    </div>
  );
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
