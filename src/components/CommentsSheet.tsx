import { useEffect, useState } from "react";
import { useHistoryBackClose } from "@/hooks/use-history-back-close";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AvatarImg } from "@/components/AvatarImg";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function CommentsSheet({
  postId,
  onClose,
  onCountChange,
}: {
  postId: string;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}) {
  const handleClose = useHistoryBackClose(onClose);
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, content, created_at, is_hidden")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      const list = (data ?? []) as Comment[];
      setItems(list);
      onCountChange?.(list.length);
      const ids = Array.from(new Set(list.map((c) => c.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        const map: Record<string, Profile> = {};
        (ps ?? []).forEach((p: any) => (map[p.id] = p));
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [postId, onCountChange]);

  const submit = async () => {
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, content })
      .select("id, post_id, user_id, content, created_at, is_hidden")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("Couldn't send");
      return;
    }
    const next = [...items, data as Comment];
    setItems(next);
    onCountChange?.(next.length);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center sm:justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold">Comments</h3>
          <button onClick={handleClose} aria-label="Close" className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">Be the first to comment.</p>
          ) : (
            items.map((c) => {
              const prof = profiles[c.user_id];
              const name = prof?.display_name ?? prof?.username ?? "User";
              return (
                <div key={c.id} className="flex gap-2">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    <AvatarImg src={prof?.avatar_url} alt={name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{name}</p>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={user ? "Write a comment…" : "Sign in to comment"}
            disabled={!user || busy}
            className="flex-1 h-10 px-4 rounded-full bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={!user || busy || !text.trim()}
            className="h-10 px-4 rounded-full bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
