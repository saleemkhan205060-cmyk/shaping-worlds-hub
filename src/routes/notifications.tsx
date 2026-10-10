import { FullscreenVideoPlayer, type FsItem } from "@/components/FullscreenVideoPlayer";
import { CommentsSheet } from "@/components/CommentsSheet";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { AvatarImg } from "../components/AvatarImg";
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
  kind: "like" | "comment" | "follow" | "interested";
  who: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
  user_id: string;
  post_id?: string;
  thumb?: string | null;
  post_type?: "image" | "video" | "text";
};

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [chimeOn, setChimeOn] = useState(true);
 const [fsItem, setFsItem] = useState<FsItem | null>(null);
 const [commentsFor, setCommentsFor] = useState<string | null>(null);
 const fsItems = useMemo(() => (fsItem ? [fsItem] : []), [fsItem]);
 const postMapRef = useRef<Record<string, any>>({});

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

 const openPost = (postId: string) => {
  const p = postMapRef.current[postId];

  if (!p) return;

  if (
    (p.media_type === "image" || p.media_type === "video") &&
    p.media_url
  ) {
    setFsItem({
      ...p,
      media_type: p.media_type,
    } as FsItem);
  } else {
    setCommentsFor(p.id);
  }
};

  useEffect(() => {
    if (loading) return;
    if (!user) { setBusy(false); return; }

    (async () => {
      setBusy(true);
      const { data: myPosts } = await supabase
  .from("posts")
  .select("id,user_id,media_url,media_type,caption,created_at,thumbnail_url")
  .eq("user_id", user.id);

const postIds = (myPosts ?? []).map((p) => p.id);

const postMap: Record<string, any> = {};
(myPosts ?? []).forEach((p) => {
  postMap[p.id] = p;
});

postMapRef.current = postMap;

const thumbOf = (id: string) => {
  const p = postMap[id];
  if (!p) return null;

  return p.media_type === "image"
    ? p.media_url
    : p.thumbnail_url ?? null;
    };

      const [likesRes, commentsRes, followsRes, interestsRes] = await Promise.all([
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
           supabase.from("marriage_interests")
          .select("id,user_id,target_user_id,created_at")
          .eq("target_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const userIds = new Set<string>();
      (likesRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));
      (commentsRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));
      (followsRes.data ?? []).forEach((r: any) => userIds.add(r.follower_id));
      (interestsRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));

      let profileMap: Record<string, Profile> = {};
      if (userIds.size) {
        const { data: profs } = await supabase.from("profiles")
          .select("id,display_name,username,avatar_url")
          .in("id", Array.from(userIds));
        (profs ?? []).forEach((p) => { profileMap[p.id] = p as Profile; });
      }
      const name = (id: string) =>
        profileMap[id]?.display_name || profileMap[id]?.username || "Someone";

      const merged: Item[] = [
       ...(likesRes.data ?? []).map((r: any) => ({
        id: `l-${r.id}`,
        kind: "like" as const,
        who: name(r.user_id),
        avatar_url: profileMap[r.user_id]?.avatar_url ?? null,
        text: "liked your post",
       created_at: r.created_at,
        user_id: r.user_id,
       post_id: r.post_id,
        thumb: thumbOf(r.post_id),
         post_type: postMap[r.post_id]?.media_type,
         })),
        ...(commentsRes.data ?? []).map((r: any) => ({
       id: `c-${r.id}`,
       kind: "comment" as const,
       who: name(r.user_id),
         avatar_url: profileMap[r.user_id]?.avatar_url ?? null,
       text: `commented: ${r.content.slice(0, 80)}`,
       created_at: r.created_at,
        user_id: r.user_id,
         post_id: r.post_id,
          thumb: thumbOf(r.post_id),
          post_type: postMap[r.post_id]?.media_type,
          })),
        ...(followsRes.data ?? []).map((r: any) => ({
          id: `f-${r.id}`, kind: "follow" as const, who: name(r.follower_id),
          avatar_url: profileMap[r.follower_id]?.avatar_url ?? null,
          text: "started following you", created_at: r.created_at,
          user_id: r.follower_id,
        })),

      ...(interestsRes.data ?? []).map((r: any) => ({
        id: `i-${r.id}`,
        kind: "interested" as const,
        who: name(r.user_id),
       avatar_url: profileMap[r.user_id]?.avatar_url ?? null,
       text: "is interested in your marriage profile",
       created_at: r.created_at,
       user_id: r.user_id,
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
     k === "like"
    ? Heart
    : k === "comment"
    ? MessageCircle
    : k === "interested"
    ? Heart
    : UserPlus;
 
  return (
    <Layout>
     <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 -ml-2">
        <Link to="/" className="h-10 w-10 rounded-full bg-[#005A35] border border-[#19D66B] flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-full bg-[#005A35] border border-[#19D66B] flex items-center justify-center text-white shadow">
            <Bell className="h-5 w-5" />
          </span>
         <h1 className="text-xl font-extrabold text-white">Notifications</h1>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleChime}
        className="flex items-center gap-2"
        aria-pressed={chimeOn}
      >
        <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${chimeOn ? "bg-indigo-600" : "bg-slate-300"}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${chimeOn ? "translate-x-5" : "translate-x-1"}`} />
        </span>
      </button>
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
        <ul className="space-y-2 flex flex-col items-start">
          {items.map((n) => {
            const Icon = IconFor(n.kind);
            return (
              <li
            key={n.id}
            onClick={() => {
          if (
         (n.kind === "like" || n.kind === "comment") &&
         n.post_id
         ) {
        openPost(n.post_id);
        } else if (n.kind === "follow") {
       navigate({
     to: "/u/$id",
      params: { id: n.user_id },
       });
      } else if (n.kind === "interested") {
       navigate({
      to: "/marriage",
      search: { profile: n.user_id },
       });
        }
         }}
          className={`w-fit max-w-full bg-[#005A35] rounded-2xl border border-[#19D66B] px-3 py-1.5 flex items-center gap-3 ${
           (n.kind === "like" ||
           n.kind === "comment" ||
            n.kind === "follow" ||
             n.kind === "interested")
             ? "cursor-pointer"
             : ""
           }`}
           >
      <span className="h-9 w-9 rounded-full bg-[#005A35] border border-[#7CFF3B] flex items-center justify-center shrink-0">
        <Icon
        className={`h-5 w-5 ${
        n.kind === "like"
        ? "text-red-500 fill-red-500 stroke-white"
         : "text-white"
         }`}
         />
     </span>

    <div className="flex-1 min-w-0">
       <p className="text-sm text-white">
     <span className="font-bold">{n.who}</span> {n.text}
   </p>
      <p className="text-xs text-white/70">
       {timeAgo(n.created_at)} ago
       </p>
        </div>

        {(n.kind === "like" || n.kind === "comment") ? (
       <div className="h-11 w-11 rounded-xl overflow-hidden bg-[#003D25] border border-[#7CFF3B] shrink-0">
        {n.thumb ? (
         <img
        src={n.thumb}
        alt="Post"
        className="h-full w-full object-cover"
      />
    ) : n.post_type === "video" ? (
      <video
        src={`${postMapRef.current[n.post_id!]?.media_url}#t=0.1`}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
    ) : (
      <MessageCircle className="h-5 w-5 text-white m-auto mt-3" />
    )}
  </div>
) : (
  <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
    <AvatarImg
      src={n.avatar_url}
      alt={n.who}
      className="h-full w-full object-cover"
    />
  </div>
     )}
                
       </li>
         );
          })}
         </ul>
          )}

        {fsItems.length > 0 && (
       <FullscreenVideoPlayer
        items={fsItems}
         startIndex={0}
          onClose={() => setFsItem(null)}
          useHistoryBack={false}
          />
        )}

       {commentsFor && (
        <CommentsSheet
          postId={commentsFor}
          onClose={() => setCommentsFor(null)}
        />
       )}
    </Layout>
  );
}
