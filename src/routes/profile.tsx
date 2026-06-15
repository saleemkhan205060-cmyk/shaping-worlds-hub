import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pencil, Save, X, UserPlus, Share2, ChevronDown, Star, User } from "lucide-react";
import { Layout } from "../components/Layout";
import { MapPin, Link as LinkIcon, Calendar, Play, Heart, Users, Loader2, UploadCloud, Trash2, Lock, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FullscreenVideoPlayer, type FsItem } from "../components/FullscreenVideoPlayer";
import { MediaActions } from "@/components/MediaActions";
import { AvatarImg } from "@/components/AvatarImg";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SearchablePicker } from "@/components/SearchablePicker";
import { COUNTRIES, LANGUAGES, PROFESSIONS, EDUCATION } from "@/lib/picker-options";
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
  thumbnail_url: string | null;
};

const TABS = ["Posts", "Videos"] as const;
type Tab = (typeof TABS)[number];

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
  const search = Route.useSearch() as { about?: string; edit?: string };
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
  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [nameText, setNameText] = useState("");
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const BIO_CHAR_LIMIT = 80;
  const bioCharCount = bioText.length;

  type ListUser = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
  const [listKind, setListKind] = useState<null | "followers" | "following">(null);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const openList = async (kind: "followers" | "following") => {
    if (!user) return;
    setListKind(kind);
    setListUsers([]);
    setListLoading(true);
    const col = kind === "followers" ? "following_id" : "follower_id";
    const otherCol = kind === "followers" ? "follower_id" : "following_id";
    const { data: rows } = await supabase.from("follows").select(otherCol).eq(col, user.id);
    const ids = ((rows ?? []) as Array<Record<string, string>>).map((r) => r[otherCol]).filter(Boolean);
    if (ids.length === 0) {
      setListLoading(false);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", ids);
    setListUsers((profs as ListUser[]) ?? []);
    setListLoading(false);
  };

  type AboutInfo = {
    userName: string;
    gender: string;
    dob: string;
    profession: string;
    education: string;
    country: string;
    maritalStatus: string;
    languages: string;
    email: string;
    emailPrivate: boolean;
    mobile: string;
    mobilePrivate: boolean;
    website: string;
    isPublic: boolean;
  };

  const defaultAbout = (): AboutInfo => ({
    userName: "",
    gender: "",
    dob: "",
    profession: "",
    education: "",
    country: "",
    maritalStatus: "",
    languages: "",
    email: "",
    emailPrivate: true,
    mobile: "",
    mobilePrivate: true,
    website: "",
    isPublic: false,
  });

  const [about, setAbout] = useState<AboutInfo>(defaultAbout);
  const [editAbout, setEditAbout] = useState<AboutInfo>(defaultAbout);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const base = { ...defaultAbout(), email: user.email ?? "" };
    (async () => {
      const { data } = await supabase
        .from("profile_about")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setAbout({
          ...base,
          userName: data.user_name ?? "",
          gender: data.gender ?? "",
          dob: data.dob ?? "",
          profession: data.profession ?? "",
          education: data.education ?? "",
          country: data.country ?? "",
          maritalStatus: data.marital_status ?? "",
          languages: data.languages ?? "",
          email: data.email || base.email,
          emailPrivate: data.email_private ?? true,
          mobile: data.mobile ?? "",
          mobilePrivate: data.mobile_private ?? true,
          website: data.website ?? "",
        });
        return;
      }
      // One-time migration from legacy localStorage
      try {
        const raw = localStorage.getItem(`about:${user.id}`);
        if (raw) {
          const parsed = { ...base, ...JSON.parse(raw) };
          setAbout(parsed);
          await supabase.from("profile_about").upsert({
            user_id: user.id,
            user_name: parsed.userName ?? "",
            gender: parsed.gender ?? "",
            dob: parsed.dob ?? "",
            profession: parsed.profession ?? "",
            education: parsed.education ?? "",
            country: parsed.country ?? "",
            marital_status: parsed.maritalStatus ?? "",
            languages: parsed.languages ?? "",
            email: parsed.email ?? "",
            email_private: parsed.emailPrivate ?? true,
            mobile: parsed.mobile ?? "",
            mobile_private: parsed.mobilePrivate ?? true,
            website: parsed.website ?? "",
          });
          localStorage.removeItem(`about:${user.id}`);
          return;
        }
      } catch {
        // ignore
      }
      setAbout(base);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


  useEffect(() => {
    if (search.about === "open") {
      setAboutOpen(true);
      navigate({ to: "/profile", search: {} });
    }
  }, [search.about, navigate]);

  useEffect(() => {
    if (search.edit === "open") {
      startEditBio();
      navigate({ to: "/profile", search: {} });
    }
  }, [search.edit, navigate]);

  const DEFAULT_BIO =
    "Building communities at the intersection of entertainment, business and meaningful relationships. Shaping the world one connection at a time.";

  const startEditBio = () => {
    setNameText(profile?.display_name ?? user?.email?.split("@")[0] ?? "");
    setBioText(profile?.bio ?? "");
    setEditingBio(true);
  };

  const saveBio = async () => {
    if (!user) return;
    const trimmedName = nameText.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }
    if (bioText.length > BIO_CHAR_LIMIT) {
      toast.error(`Bio must be ${BIO_CHAR_LIMIT} characters or less`);
      return;
    }
    setSavingBio(true);
    const updates = {
      display_name: trimmedName,
      bio: bioText.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      toast.error("Failed to update profile");
      setSavingBio(false);
      return;
    }
    setProfile((p) => (p ? { ...p, ...updates } : p));
    toast.success("Profile updated");
    setSavingBio(false);
    setEditingBio(false);
  };


  const startEditAbout = () => {
    setEditAbout({ ...about });
    setEditingAbout(true);
  };

  const saveAbout = async () => {
    if (!user) return;
    const next = { ...editAbout };
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email.trim())) {
      toast.error("Invalid email address");
      return;
    }
    setSavingAbout(true);
    const { error } = await supabase.from("profile_about").upsert({
      user_id: user.id,
      user_name: next.userName ?? "",
      gender: next.gender ?? "",
      dob: next.dob ?? "",
      profession: next.profession ?? "",
      education: next.education ?? "",
      country: next.country ?? "",
      marital_status: next.maritalStatus ?? "",
      languages: next.languages ?? "",
      email: next.email ?? "",
      email_private: next.emailPrivate ?? true,
      mobile: next.mobile ?? "",
      mobile_private: next.mobilePrivate ?? true,
      website: next.website ?? "",
    });
    if (error) {
      toast.error("Failed to save");
      setSavingAbout(false);
      return;
    }
    setAbout(next);
    toast.success("About updated");
    setEditingAbout(false);
    setSavingAbout(false);
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
      .select("id, media_url, media_type, caption, created_at, is_private, thumbnail_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as Post[]) ?? []));
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id)
      .then(({ count }) => setFollowersCount(count ?? 0));
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id)
      .then(({ count }) => setFollowingCount(count ?? 0));
  }, [user]);

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
          </div>

        </div>

        {/* Centered avatar with + badge */}
        <div className="flex justify-center mt-6">
          <div className="relative h-28 w-28">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
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

        {/* Name row: name + dropdown centered */}
        <div className="mt-5 px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 justify-self-center outline-none"
              >
                <h1 className="text-2xl font-extrabold text-slate-900">{displayName}</h1>
                <ChevronDown className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem onClick={startEditBio}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                <User className="h-4 w-4 mr-2" /> About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div />
        </div>

        {/* Bio under name */}
        {profile?.bio && (
          <p className="mt-2 px-6 text-center text-sm text-slate-600 whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}


        {/* Stats: Following | Followers | Likes */}
        <div className="mt-6 px-4 grid grid-cols-3 items-center">
          <button
            type="button"
            onClick={() => openList("following")}
            className="text-center py-1 hover:bg-slate-50 rounded-lg transition"
          >
            <div className="text-2xl font-extrabold text-slate-900">{followingCount}</div>
            <div className="text-sm text-slate-400 mt-0.5">Following</div>
          </button>
          <button
            type="button"
            onClick={() => openList("followers")}
            className="text-center py-1 border-x border-slate-200 hover:bg-slate-50 transition"
          >
            <div className="text-2xl font-extrabold text-slate-900">{followersCount}</div>
            <div className="text-sm text-slate-400 mt-0.5">Followers</div>
          </button>
          <div className="text-center">
            <div className="text-2xl font-extrabold text-slate-900">{posts.length}</div>
            <div className="text-sm text-slate-400 mt-0.5">Likes</div>
          </div>
        </div>


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

        {/* Edit profile bottom sheet */}
        <Drawer open={editingBio} onOpenChange={(o) => !savingBio && setEditingBio(o)}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Edit profile</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4 overflow-y-auto">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Bio</span>
                  <span
                    className={`text-xs font-medium ${
                      bioCharCount > BIO_CHAR_LIMIT ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {bioCharCount}/{BIO_CHAR_LIMIT}
                  </span>
                </div>
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  rows={5}
                  maxLength={BIO_CHAR_LIMIT}
                  placeholder="Tell people about yourself"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveBio}
                  disabled={savingBio || bioCharCount > BIO_CHAR_LIMIT || !nameText.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button
                  onClick={() => setEditingBio(false)}
                  disabled={savingBio}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Followers / Following list */}
        <Drawer open={listKind !== null} onOpenChange={(o) => !o && setListKind(null)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="capitalize">{listKind ?? ""}</DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-6 overflow-y-auto">
              {listLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                </div>
              ) : listUsers.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  No {listKind} yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {listUsers.map((u) => {
                    const name = u.display_name ?? u.username ?? "User";
                    const handle = u.username ?? name;
                    return (
                      <li key={u.id}>
                        <Link
                          to="/u/$id"
                          params={{ id: u.id }}
                          onClick={() => setListKind(null)}
                          className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-lg"
                        >
                          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                            <AvatarImg src={u.avatar_url} alt={name} className="h-11 w-11 rounded-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">{name}</div>
                            <div className="text-xs text-slate-500 truncate">@{handle}</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </DrawerContent>
        </Drawer>

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
                          thumbnail_url: x.thumbnail_url,
                        })),
                        index: idx,
                      })}
                      className="absolute inset-0 w-full h-full block"
                      aria-label={p.media_type === "video" ? "Play video" : "Open photo"}
                    >
                      {p.media_type === "video" ? (
                        <video src={p.media_url} poster={p.thumbnail_url ?? undefined} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
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
      </div>
      <Drawer open={aboutOpen} onOpenChange={(o) => { setAboutOpen(o); if (!o) setEditingAbout(false); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>About</DrawerTitle>
          </DrawerHeader>
          <div data-no-translate className="px-4 pb-6 overflow-y-auto text-sm text-slate-700 space-y-3">
            {!editingAbout ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Account Information</h3>
                  <button
                    onClick={startEditAbout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
                <p><strong>Gender:</strong> {about.gender || "—"}</p>
                <p><strong>Date of Birth / Age:</strong> {about.dob || "—"}</p>
                <p><strong>Profession / Job:</strong> {about.profession || "—"}</p>
                <p><strong>Education:</strong> {about.education || "—"}</p>
                <p><strong>Country:</strong> {about.country || "—"}</p>
                <p><strong>Marital Status:</strong> {about.maritalStatus || "—"}</p>
                <p><strong>Languages:</strong> {about.languages || "—"}</p>
                <p className="flex flex-wrap items-center gap-2">
                  <strong>Email:</strong>
                  <span>{about.emailPrivate ? "Private" : (about.email || "—")}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${about.emailPrivate ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {about.emailPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {about.emailPrivate ? "Private" : "Public"}
                  </span>
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <strong>Mobile Number:</strong>
                  <span>{about.mobilePrivate ? "Private" : (about.mobile || "—")}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${about.mobilePrivate ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {about.mobilePrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {about.mobilePrivate ? "Private" : "Public"}
                  </span>
                </p>
                <p className="break-all"><strong>Website / Social Links:</strong> {about.website || "—"}</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900">Edit About</h3>
                {[
                  { key: "gender", label: "Gender", type: "select", options: ["", "Male", "Female", "Other", "Prefer not to say"] },
                  { key: "dob", label: "Date of Birth / Age", type: "text", placeholder: "e.g. 1995-04-12 or 29" },
                  { key: "profession", label: "Profession / Job", type: "picker", options: PROFESSIONS, placeholder: "Select profession" },
                  { key: "education", label: "Education", type: "picker", options: EDUCATION, placeholder: "Select education" },
                  { key: "country", label: "Country", type: "picker", options: COUNTRIES, placeholder: "Select country" },
                  { key: "maritalStatus", label: "Marital Status", type: "select", options: ["", "Single", "Married", "Divorced", "Widowed"] },
                  { key: "languages", label: "Languages", type: "picker", options: LANGUAGES, placeholder: "Select language" },
                ].map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-medium text-slate-600">{f.label}</span>
                    {f.type === "select" ? (
                      <select
                        value={(editAbout as any)[f.key]}
                        onChange={(e) => setEditAbout({ ...editAbout, [f.key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {(f.options as string[]).map((o) => (
                          <option key={o} value={o}>{o || "Select..."}</option>
                        ))}
                      </select>
                    ) : f.type === "picker" ? (
                      <SearchablePicker
                        value={(editAbout as any)[f.key] || ""}
                        onChange={(v) => setEditAbout({ ...editAbout, [f.key]: v })}
                        options={f.options as string[]}
                        placeholder={(f as any).placeholder}
                        title={f.label}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={(f as any).placeholder}
                        value={(editAbout as any)[f.key]}
                        onChange={(e) => setEditAbout({ ...editAbout, [f.key]: e.target.value })}
                        maxLength={200}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </label>
                ))}

                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Email (Optional)</span>
                  <input
                    type="email"
                    value={editAbout.email}
                    onChange={(e) => setEditAbout({ ...editAbout, email: e.target.value })}
                    maxLength={255}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditAbout({ ...editAbout, emailPrivate: false })}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${!editAbout.emailPrivate ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                    >
                      <Globe className="h-3 w-3" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAbout({ ...editAbout, emailPrivate: true })}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${editAbout.emailPrivate ? "bg-slate-700 text-white" : "text-slate-600"}`}
                    >
                      <Lock className="h-3 w-3" /> Private
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Mobile Number (Optional)</span>
                  <input
                    type="tel"
                    value={editAbout.mobile}
                    onChange={(e) => setEditAbout({ ...editAbout, mobile: e.target.value })}
                    maxLength={32}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditAbout({ ...editAbout, mobilePrivate: false })}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${!editAbout.mobilePrivate ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                    >
                      <Globe className="h-3 w-3" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAbout({ ...editAbout, mobilePrivate: true })}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${editAbout.mobilePrivate ? "bg-slate-700 text-white" : "text-slate-600"}`}
                    >
                      <Lock className="h-3 w-3" /> Private
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Website / Social Links</span>
                  <input
                    type="text"
                    value={editAbout.website}
                    onChange={(e) => setEditAbout({ ...editAbout, website: e.target.value })}
                    maxLength={500}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
        </DrawerContent>
      </Drawer>

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
