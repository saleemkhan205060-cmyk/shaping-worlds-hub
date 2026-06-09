import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Bell, Heart, MessageCircle, UserPlus, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  isNotificationChimeEnabled,
  setNotificationChimeEnabled,
  subscribeNotificationChimePref,
  playSoftChime,
} from "@/lib/notification-sound";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — VIP Life" },
      { name: "description", content: "All your latest follows, likes, comments, and activity." },
    ],
  }),
});

type Item = {
  id: string;
  kind: "like" | "comment" | "follow";
  who: string;
  text: string;
  created_at: string;
};

type Profile = { id: string; display_name: string | null; username: string | null };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [chimeOn, setChimeOn] = useState(true);

  useEffect(() => {
    setChimeOn(isNotificationChimeEnabled());
    return subscribeNotificationChimePref(setChimeOn);
  }, []);

  const toggleChime = () => {
    const next = !chimeOn;
    setChimeOn(next);
    setNotificationChimeEnabled(next);
    if (next) playSoftChime(`pref-${Date.now()}`);
  };


  useEffect(() => {
    if (loading) return;
    if (!user) { setBusy(false); return; }

    (async () => {
      setBusy(true);
      const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", user.id);
      const postIds = (myPosts ?? []).map((p) => p.id);

      const [likesRes, commentsRes, followsRes] = await Promise.all([
        postIds.length
          ? supabase.from("post_likes").select("id,user_id,post_id,created_at")
              .in("post_id", postIds).neq("user_id", user.id)
              .order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length
          ? supabase.from("post_comments").select("id,user_id,post_id,content,created_at")
              .in("post_id", postIds).neq("user_id", user.id)
              .order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("follows").select("id,follower_id,created_at")
          .eq("following_id", user.id)
          .order("created_at", { ascending: false }).limit(50),
      ]);

      const userIds = new Set<string>();
      (likesRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));
      (commentsRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));
      (followsRes.data ?? []).forEach((r: any) => userIds.add(r.follower_id));

      let profileMap: Record<string, Profile> = {};
      if (userIds.size) {
        const { data: profs } = await supabase.from("profiles")
          .select("id,display_name,username")
          .in("id", Array.from(userIds));
        (profs ?? []).forEach((p) => { profileMap[p.id] = p as Profile; });
      }
      const name = (id: string) =>
        profileMap[id]?.display_name || profileMap[id]?.username || "Someone";

      const merged: Item[] = [
        ...(likesRes.data ?? []).map((r: any) => ({
          id: `l-${r.id}`, kind: "like" as const, who: name(r.user_id),
          text: "liked your post", created_at: r.created_at,
        })),
        ...(commentsRes.data ?? []).map((r: any) => ({
          id: `c-${r.id}`, kind: "comment" as const, who: name(r.user_id),
          text: `commented: ${r.content.slice(0, 80)}`, created_at: r.created_at,
        })),
        ...(followsRes.data ?? []).map((r: any) => ({
          id: `f-${r.id}`, kind: "follow" as const, who: name(r.follower_id),
          text: "started following you", created_at: r.created_at,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

      setItems(merged);
      setBusy(false);
    })();
  }, [user, loading]);

  const tintFor = (k: Item["kind"]) =>
    k === "like" ? "from-rose-500 to-pink-500"
    : k === "comment" ? "from-sky-500 to-indigo-500"
    : "from-emerald-500 to-teal-500";

  const IconFor = (k: Item["kind"]) =>
    k === "like" ? Heart : k === "comment" ? MessageCircle : UserPlus;

  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow">
            <Bell className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
        </div>
      </div>

      {!user && !loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <p className="text-slate-600 mb-3">Sign in to see your notifications.</p>
          <Link to="/auth" className="inline-flex px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold">Sign in</Link>
        </div>
      ) : busy ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = IconFor(n.kind);
            return (
              <li key={n.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                <span className={`h-11 w-11 rounded-full bg-gradient-to-br ${tintFor(n.kind)} text-white flex items-center justify-center shrink-0`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-bold">{n.who}</span> {n.text}</p>
                  <p className="text-xs text-slate-500">{timeAgo(n.created_at)} ago</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}
