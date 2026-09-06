import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { Calendar, CheckCircle2, Play, Heart, Loader2, ArrowLeft, UserPlus, UserCheck, MessageCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FullscreenVideoPlayer, type FsItem } from "@/components/FullscreenVideoPlayer";
import { MediaActions } from "@/components/MediaActions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/resumable-upload";
import { moderateMedia } from "@/lib/moderation-bridge";

export const Route = createFileRoute("/u/$id")({ component: UserProfile });

type Post = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video" | "text";
  caption: string | null;
  created_at: string;
  thumbnail_url: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  cover_url: string | null;
};

const TABS = ["Posts", "Videos", "Photos"] as const;
type Tab = (typeof TABS)[number];

function UserProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Posts");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [fsOpen, setFsOpen] = useState(false);
  const [fsIndex, setFsIndex] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followBackBusy, setFollowBackBusy] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const isSelf = !!user && user.id === id;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = async (file: File | null) => {
    if (!file || !user || !isSelf) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image.");
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/cover-${Date.now()}.${ext}`;

    try {
      await uploadToStorage({ bucket: "media", path, file });

      // Safety scan BEFORE the photo is linked to the profile. Rejected files
      // are deleted server-side, so other users never see them.
      toast.message("Checking photo…");
      const verdict = await moderateMedia({ bucket: "media", path, mediaType: "image", surface: "cover" });
      if (!verdict.safe) {
        toast.error(
          `Cover photo rejected by our safety filter (${verdict.reason ?? "inappropriate"}). Nude or sexually suggestive images are not allowed.`,
          { duration: 6000 },
        );
        return;
      }

      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const coverUrl = data.publicUrl;

      const { error } = await supabase
        .from("profiles")
        .update({ cover_url: coverUrl })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, cover_url: coverUrl } : prev));

      toast.success("Cover photo updated!");
    } catch (error) {
      console.error("Cover upload error:", error);
      toast.error("Cover photo upload failed.");
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!file || !user || !isSelf) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image.");
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    try {
      await uploadToStorage({ bucket: "media", path, file });

      toast.message("Checking photo…");
      const verdict = await moderateMedia({ bucket: "media", path, mediaType: "image", surface: "avatar" });
      if (!verdict.safe) {
        toast.error(
          `Profile photo rejected by our safety filter (${verdict.reason ?? "inappropriate"}). Nude or sexually suggestive images are not allowed.`,
          { duration: 6000 },
        );
        return;
      }

      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const avatarUrl = data.publicUrl;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));

      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Profile photo upload failed.");
    }
  };

  const refreshFollows = () => {
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", id)
      .then(({ count }) => setFollowersCount(count ?? 0));
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", id)
      .then(({ count }) => setFollowingCount(count ?? 0));
    if (user && !isSelf) {
      supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle()
        .then(({ data }) => setIsFollowing(!!data));
    } else {
      setIsFollowing(false);
    }
  };
  const openFollowers = async () => {
  setFollowersOpen(true);
  setFollowersLoading(true);

  try {
    const { data: followRows, error: followsError } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", id);

    if (followsError) throw followsError;

    const followerIds = (followRows ?? []).map((row) => row.follower_id);

    if (followerIds.length === 0) {
      setFollowers([]);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, created_at, cover_url")
      .in("id", followerIds);

    if (profilesError) throw profilesError;

    setFollowers((profilesData ?? []) as ProfileRow[]);
    const { data: myFollows } = await supabase
  .from("follows")
  .select("following_id")
  .eq("follower_id", user?.id ?? "");

   setFollowingUsers(
  new Set((myFollows ?? []).map((row) => row.following_id))
);
  } catch (error) {
    console.error("Followers load error:", error);
    toast.error("Couldn't load followers.");
  } finally {
    setFollowersLoading(false);
  }
};

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, created_at, updated_at, cover_url, bio, location, website, is_verified").eq("id", id).maybeSingle(),
      supabase
        .from("posts")
        .select("id, user_id, media_url, media_type, caption, created_at, thumbnail_url")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([{ data: prof }, { data: pp }]) => {
      setProfile((prof as ProfileRow | null) ?? null);
      setPosts(((pp ?? []) as Post[]).filter((p) => !!p.media_url));
      setLoading(false);
    });
    refreshFollows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const toggleFollow = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (isSelf || followBusy) return;
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
      if (error) {
        console.error("Unfollow error:", error);
        toast.error("Couldn't unfollow. Please try again.");
      } else {
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) {
        console.error("Follow error:", error);
        toast.error("Couldn't follow. Please try again.");
      }
      else {
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    }
    setFollowBusy(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">
          <p>User not found.</p>
          <Link to="/" className="text-indigo-600 font-semibold mt-3 inline-block">Back home</Link>
        </div>
      </Layout>
    );
  }

  const displayName = profile.display_name ?? profile.username ?? "User";
  const handle = profile.username ?? displayName;
  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";

  const videos = posts.filter((p) => p.media_type === "video");
  const photos = posts.filter((p) => p.media_type === "image");

  const items: Post[] =
    tab === "Videos" ? videos : tab === "Photos" ? photos : posts;

  const fsItems: FsItem[] = items
    .filter((p) => p.media_type === "image" || p.media_type === "video")
    .map((p) => ({
      id: p.id,
      user_id: p.user_id,
      media_url: p.media_url,
      media_type: p.media_type as "image" | "video",
      caption: p.caption,
      created_at: p.created_at,
      thumbnail_url: p.thumbnail_url,
    }));

  const openAt = (postId: string) => {
    const idx = fsItems.findIndex((f) => f.id === postId);
    if (idx < 0) return;
    setFsIndex(idx);
    setFsOpen(true);
  };

  return (
    <Layout>
      <div className="mb-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
        <div className="relative h-40 sm:h-56 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
  {profile.cover_url && (
    <img
      src={profile.cover_url}
      alt="Cover"
      className="absolute inset-0 w-full h-full object-cover"
      referrerPolicy="no-referrer"
    />
  )}

  {isSelf && (
  <button
    type="button"
    onClick={() => coverInputRef.current?.click()}
      className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition"
      aria-label="Edit cover photo"
    >
      <Pencil className="h-4 w-4 text-slate-700" />
    </button>
  )}

  <input
    ref={coverInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
  />
</div>
        <div className="px-5 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative z-20 w-fit">
             {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="relative z-20 h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 ring-4 ring-white flex items-center justify-center text-white text-3xl font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
              {isSelf && (
  <button
    type="button"
    onClick={() => avatarInputRef.current?.click()}
    className="absolute bottom-1 right-1 z-30 h-7 w-7 rounded-full bg-[#057640] shadow-md flex items-center justify-center"
    aria-label="Change profile photo"
  >
    <span className="text-lg font-bold text-white">+</span>
  </button>
)}
              <input
  ref={avatarInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold">{displayName}</h1>
                <CheckCircle2 className="h-5 w-5 text-sky-500 fill-sky-500" />
                {!isSelf && (
                  <button
                    onClick={() => navigate({ to: "/messages", search: { to: id } })}
                    className="relative ml-1 focus:outline-none"
                    aria-label="Send message"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-2 ring-white/80">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500">@{handle}</p>
            </div>
            {!isSelf && (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition disabled:opacity-60 ${
                  isFollowing
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {followBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Joined {joined}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-md">
            <button
            type="button"
            onClick={openFollowers}
            className="text-left"
            >
           <Stat label="Followers" value={String(followersCount)} />
            </button>
            <Stat label="Following" value={String(followingCount)} />
            <Stat label="Posts" value={String(posts.length)} />
          </div>
        </div>
      </div>
             {followersOpen && (
        <div
          className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setFollowersOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h2 className="font-bold text-lg">Followers</h2>

              <button
                type="button"
                onClick={() => setFollowersOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
              {followersLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : followers.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No followers yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {followers.map((follower) => {
                    const name =
                      follower.display_name ?? follower.username ?? "User";

                    return (
                  <div
                   key={follower.id}
                    onClick={() => {
                      setFollowersOpen(false);
                         navigate({
                            to: "/u/$id",
                            params: { id: follower.id },
                          });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                      >
                        {follower.avatar_url ? (
                          <img
                            src={follower.avatar_url}
                            alt={name}
                            className="h-11 w-11 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                            {name[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-semibold truncate">{name}</p>

                          {follower.username && (
  <p className="text-sm text-slate-500 truncate">
    @{follower.username}
  </p>
)}

<button
  type="button"
  disabled={
    followingUsers.has(follower.id) ||
    followBackBusy === follower.id
  }
  onClick={async (e) => {
    e.stopPropagation();

    if (!user || followingUsers.has(follower.id)) return;

    setFollowBackBusy(follower.id);

    const { error } = await supabase
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: follower.id,
      });

    if (error) {
      toast.error("Couldn't follow back. Please try again.");
    } else {
      setFollowingUsers((prev) => {
        const next = new Set(prev);
        next.add(follower.id);
        return next;
      });
    }

    setFollowBackBusy(null);
  }}
  className={`mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
    followingUsers.has(follower.id)
      ? "bg-slate-100 text-slate-600"
      : "bg-indigo-600 text-white"
  }`}
>
  {followingUsers.has(follower.id) ? "Following" : "Follow back"}
</button>
                        </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No {tab.toLowerCase()} yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((p) => (
              <MediaActions
                key={p.id}
                postId={p.id}
                ownerId={p.user_id}
                mediaUrl={p.media_url}
                caption={p.caption}
                onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
              >
                <button
                  onClick={() => openAt(p.id)}
                  className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group"
                >
                  {p.media_type === "video" ? (
                    <>
                      {p.thumbnail_url ? (
                        <img
                          src={p.thumbnail_url}
                          alt={p.caption ?? "Video thumbnail"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="absolute inset-0 bg-slate-900" aria-hidden="true" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                        <span className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={p.media_url}
                      alt={p.caption ?? "Post"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              </MediaActions>
            ))}
          </div>
        )}
      </div>

      {fsOpen && fsItems.length > 0 && (
        <FullscreenVideoPlayer
          items={fsItems}
          startIndex={fsIndex}
          onClose={() => setFsOpen(false)}
        />
      )}
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
      <Heart className="h-4 w-4 text-indigo-600 mx-auto" />
      <div className="mt-1 font-bold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
