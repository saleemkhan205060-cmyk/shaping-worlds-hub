import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pencil, Save, X, UserPlus, Share2, Menu, ChevronDown, Star, LogOut, User } from "lucide-react";
import { Layout } from "../components/Layout";
import { MapPin, Link as LinkIcon, Calendar, Play, Heart, Users, Loader2, UploadCloud, Trash2, Lock, Globe } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FullscreenVideoPlayer, type FsItem } from "../components/FullscreenVideoPlayer";
import { MediaActions } from "@/components/MediaActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export const Route = createFileRoute("/profile")({ component: Profile });

type Post = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  is_private: boolean;
};

const TABS = ["Posts", "Videos"] as const;
type Tab = (typeof TABS)[number] | "About";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
};

function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Posts");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [fs, setFs] = useState<{ items: FsItem[]; index: number } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [bioLocation, setBioLocation] = useState("");
  const [bioWebsite, setBioWebsite] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const DEFAULT_BIO =
    "Building communities at the intersection of entertainment, business and meaningful relationships. Shaping the world one connection at a time.";

  const startEditBio = () => {
    setBioText(profile?.bio ?? DEFAULT_BIO);
    setBioLocation(profile?.location ?? "Global");
    setBioWebsite(profile?.website ?? "shapingworld.com");
    setEditingBio(true);
  };

  const saveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    const updates = {
      bio: bioText.trim() || null,
      location: bioLocation.trim() || null,
      website: bioWebsite.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      toast.error("Failed to update bio");
      setSavingBio(false);
      return;
    }
    setProfile((p) => (p ? { ...p, ...updates } : p));
    toast.success("Bio updated");
    setSavingBio(false);
    setEditingBio(false);
  };

  const startEditAbout = () => {
    setEditName(profile?.display_name ?? user?.email?.split("@")[0] ?? "");
    setEditEmail(user?.email ?? "");
    setEditingAbout(true);
  };

  const saveAbout = async () => {
    if (!user) return;
    const name = editName.trim();
    const email = editEmail.trim();
    if (!name) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email address");
      return;
    }
    setSavingAbout(true);
    if (name !== (profile?.display_name ?? "")) {
      const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
      if (error) {
        toast.error("Failed to update name");
        setSavingAbout(false);
        return;
      }
      setProfile((p) => (p ? { ...p, display_name: name } : p));
    }
    if (email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        toast.error(error.message || "Failed to update email");
        setSavingAbout(false);
        return;
      }
      toast.success("Confirmation email sent to verify the new address");
    } else {
      toast.success("Profile updated");
    }
    setSavingAbout(false);
    setEditingAbout(false);
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data as ProfileRow | null);
    });
    supabase
      .from("posts")
      .select("id, media_url, media_type, caption, created_at, is_private")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as Post[]) ?? []));
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id)
      .then(({ count }) => setFollowersCount(count ?? 0));
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id)
      .then(({ count }) => setFollowingCount(count ?? 0));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const prev = posts;
    setPosts((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      setPosts(prev);
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
    }
  };

  const handleTogglePrivacy = async (id: string, makePrivate: boolean) => {
    const prev = posts;
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, is_private: makePrivate } : x)));
    const { error } = await supabase.from("posts").update({ is_private: makePrivate }).eq("id", id);
    if (error) {
      setPosts(prev);
      toast.error("Failed to update post");
    } else {
      toast.success(makePrivate ? "Post set to private" : "Post set to public");
    }
  };

  const handleImageUpload = async (file: File, kind: "avatar" | "cover") => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploading(kind);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      toast.error("Upload failed");
      setUploading(null);
      return;
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const url = pub.publicUrl;
    const column = kind === "avatar" ? "avatar_url" : "cover_url";
    const update = kind === "avatar" ? { avatar_url: url } : { cover_url: url };
    const { error: dbErr } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (dbErr) {
      toast.error("Failed to save profile");
    } else {
      setProfile((p) => (p ? ({ ...p, [column]: url } as ProfileRow) : p));
      toast.success(kind === "avatar" ? "Profile picture updated" : "Cover photo updated");
    }
    setUploading(null);
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </Layout>
    );
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "User";
  const handle = profile?.username ?? user.email?.split("@")[0] ?? "user";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";

  return (
    <Layout>
      <div className="bg-white">
        {/* Top icon bar */}
        <div className="flex items-center justify-between px-4 pt-3">
          <button type="button" aria-label="Add friends" className="p-1">
            <UserPlus className="h-7 w-7 text-slate-900" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Share" className="p-1">
              <Share2 className="h-7 w-7 text-slate-900" strokeWidth={2.25} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Menu" className="p-1">
                  <Menu className="h-7 w-7 text-slate-900" strokeWidth={2.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setTab("About")}>
                  <User className="h-4 w-4 mr-2" /> About
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>

        {/* Centered avatar with + badge */}
        <div className="flex justify-center mt-6">
          <div className="relative h-28 w-28">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-gradient-to-br from-amber-300 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading === "avatar"}
              className="absolute -bottom-1 right-1 h-7 w-7 rounded-full bg-sky-400 hover:bg-sky-500 text-white flex items-center justify-center shadow ring-2 ring-white disabled:opacity-60"
              aria-label="Change profile picture"
            >
              {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-lg leading-none -mt-0.5">+</span>}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "avatar");
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Name row: name + flag + chevron centered, Edit button on right */}
        <div className="mt-5 px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div />
          <div className="flex items-center gap-1.5 justify-self-center">
            <h1 className="text-2xl font-extrabold text-slate-900">{displayName}</h1>
            <ChevronDown className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="justify-self-end">
            <button
              onClick={startEditBio}
              className="px-5 py-2 rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 text-sm font-semibold"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Handle */}
        <p className="mt-1 text-center text-slate-400 text-sm">@{handle}</p>

        {/* Stats: Following | Followers | Likes */}
        <div className="mt-6 px-4 grid grid-cols-3 items-center">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-slate-900">{followingCount}</div>
            <div className="text-sm text-slate-400 mt-0.5">Following</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-2xl font-extrabold text-slate-900">{followersCount}</div>
            <div className="text-sm text-slate-400 mt-0.5">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-extrabold text-slate-900">{posts.length}</div>
            <div className="text-sm text-slate-400 mt-0.5">Likes</div>
          </div>
        </div>

        {/* Username line */}
        <p className="mt-5 text-center text-slate-900 text-base">{handle}</p>

        {/* VIP Life row */}
        <button
          type="button"
          className="mt-5 w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="relative inline-flex h-7 w-7 items-center justify-center">
              <User className="h-6 w-6 text-rose-500" strokeWidth={2} />
              <Star className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-rose-500 fill-rose-500" />
            </span>
            <span className="font-semibold text-slate-900 text-base">VIP Life</span>
          </span>
          <span className="text-slate-400 text-xl leading-none">›</span>
        </button>

        {/* Hidden cover input retained for compatibility */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageUpload(f, "cover");
            e.target.value = "";
          }}
        />

        {/* Bio editor (shown when editing) */}
        {editingBio && (
          <div className="mt-4 mx-4 space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Bio</span>
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                rows={4}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Location</span>
                <input
                  type="text"
                  value={bioLocation}
                  onChange={(e) => setBioLocation(e.target.value)}
                  maxLength={100}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Website</span>
                <input
                  type="text"
                  value={bioWebsite}
                  onChange={(e) => setBioWebsite(e.target.value)}
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveBio}
                disabled={savingBio}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingBio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                onClick={() => setEditingBio(false)}
                disabled={savingBio}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>



      <div className="mt-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {(tab === "Posts" || tab === "Videos") && (() => {
          const items = tab === "Videos" ? posts.filter((p) => p.media_type === "video") : posts;
          if (items.length === 0) {
            return (
              <div className="text-center py-12 text-slate-500 text-sm">
                No {tab.toLowerCase()} yet.{" "}
                <Link to="/upload" className="text-indigo-600 font-semibold inline-flex items-center gap-1">
                  <UploadCloud className="h-4 w-4" /> Upload one
                </Link>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((p, idx) => (
                <div key={p.id} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                  <MediaActions
                    postId={p.id}
                    ownerId={user.id}
                    mediaUrl={p.media_url}
                    caption={p.caption}
                    onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  >
                    <button
                      type="button"
                      onClick={() => setFs({
                        items: items.map((x) => ({
                          id: x.id,
                          user_id: user.id,
                          media_url: x.media_url,
                          media_type: x.media_type,
                          caption: x.caption,
                          created_at: x.created_at,
                        })),
                        index: idx,
                      })}
                      className="absolute inset-0 w-full h-full block"
                      aria-label={p.media_type === "video" ? "Play video" : "Open photo"}
                    >
                      {p.media_type === "video" ? (
                        <video src={p.media_url} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
                      ) : (
                        <img src={p.media_url} alt={p.caption ?? "Post"} className="w-full h-full object-cover" loading="lazy" />
                      )}
                      {p.media_type === "video" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition">
                          <span className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <Play className="h-4 w-4 text-slate-900 fill-slate-900 ml-0.5" />
                          </span>
                        </span>
                      )}
                    </button>
                  </MediaActions>
                  {p.is_private && (
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded pointer-events-none">
                      <Lock className="h-3 w-3" /> Private
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition z-10">
                    <button
                      onClick={() => handleTogglePrivacy(p.id, !p.is_private)}
                      className="h-7 w-7 rounded-full bg-white/95 text-slate-800 hover:bg-white flex items-center justify-center shadow"
                      title={p.is_private ? "Make public" : "Make private"}
                      aria-label={p.is_private ? "Make public" : "Make private"}
                    >
                      {p.is_private ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeletePost(p.id)}
                      className="h-7 w-7 rounded-full bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center shadow"
                      title="Delete post"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {tab === "About" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-700 space-y-3">
            {!editingAbout ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Account info</h3>
                  <button
                    onClick={startEditAbout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
                <p><strong>Name:</strong> {displayName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Joined:</strong> {joined}</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900">Edit account info</h3>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Profile name</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Email address</span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Changing your email requires confirmation via a link sent to the new address.
                  </span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveAbout}
                    disabled={savingAbout}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {savingAbout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditingAbout(false)}
                    disabled={savingAbout}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {fs && (
        <FullscreenVideoPlayer
          items={fs.items}
          startIndex={fs.index}
          onClose={() => setFs(null)}
        />
      )}
    </Layout>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
      <Icon className="h-4 w-4 text-indigo-600 mx-auto" />
      <div className="mt-1 font-bold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
