import { useEffect, useRef, useState } from "react";
import { Upload, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { moderateMedia } from "@/lib/moderation-bridge";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { VideoThumbnailPicker } from "@/components/VideoThumbnailPicker";
import { TextPostCard } from "@/components/TextPostCard";
import {
  BG_PRESETS,
  FONT_PRESETS,
  COLOR_PRESETS,
  SIZE_PRESETS,
  DEFAULT_TEXT_STYLE,
  resolveStyle,
  type TextStyle,
} from "@/components/TextPostStyles";

type Props = {
  postId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (updates: {
    caption?: string | null;
    title?: string | null;
    thumbnail_url?: string | null;
    text_style?: unknown;
  }) => void;
};

type PostRow = {
  id: string;
  user_id: string;
  media_type: "image" | "video" | "text";
  media_url: string | null;
  caption: string | null;
  title: string | null;
  thumbnail_url: string | null;
  text_style: unknown;
};

const MAX_TEXT_LEN = 280;

export function EditPostDialog({ postId, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [post, setPost] = useState<PostRow | null>(null);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [style, setStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("posts")
      .select("id,user_id,media_type,media_url,caption,title,thumbnail_url,text_style")
      .eq("id", postId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast.error("Couldn't load post");
          onClose();
          return;
        }
        const row = data as PostRow;
        setPost(row);
        setCaption(row.caption ?? "");
        setTitle(row.title ?? "");
        setThumbnailUrl(row.thumbnail_url ?? null);
        setStyle(resolveStyle(row.text_style));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId, onClose]);

  if (!open) return null;

  const isOwner = !!user && !!post && user.id === post.user_id;
  const isText = post?.media_type === "text";

  const uploadThumbFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/thumbnails/${postId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const verdict = await moderateMedia({ bucket: "media", path, mediaType: "image", surface: "thumbnail" });
    if (!verdict.safe) {
      toast.error(
        `Thumbnail rejected by our safety filter (${verdict.reason ?? "inappropriate"}). Please pick a different image.`,
        { duration: 6000 },
      );
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploading(false);
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image");
      return;
    }
    await uploadThumbFile(file);
  };

  const handleSave = async () => {
    if (!isOwner || !post) return;
    setSaving(true);
    const updates: TablesUpdate<"posts"> = {
      caption: caption.trim() || null,
      title: title.trim() || null,
    };
    if (post.media_type === "video") {
      updates.thumbnail_url = thumbnailUrl;
    }
    if (isText) {
      updates.text_style = style as never;
    }
    const { error } = await supabase.from("posts").update(updates).eq("id", postId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save changes");
      return;
    }
    toast.success("Post updated");
    onSaved?.({ ...updates, text_style: isText ? style : undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white">
        <button
          onClick={onClose}
          className="text-xl font-semibold text-slate-900 active:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || uploading || !isOwner || loading}
          className="text-xl font-semibold text-slate-900 active:opacity-60 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      ) : !isOwner ? (
        <div className="flex-1 flex items-center justify-center text-sm text-rose-600">
          You can only edit your own posts.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {isText ? (
            <>
              {/* Preview */}
              <div className="px-4 pt-2">
                <div className="rounded-2xl overflow-hidden">
                  <TextPostCard
                    text={caption || "Write something beautiful…"}
                    style={style}
                  />
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_TEXT_LEN))}
                  rows={2}
                  maxLength={MAX_TEXT_LEN}
                  placeholder="What's on your mind?"
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <div className="text-right text-[11px] text-slate-500 mt-1">
                  {caption.length}/{MAX_TEXT_LEN}
                </div>
              </div>

              {/* Controls */}
              <div className="px-5 pb-8 space-y-5">
                <Section label="Background">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {BG_PRESETS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setStyle((s) => ({ ...s, bgId: b.id }))}
                        className={`shrink-0 h-11 w-11 rounded-full border-2 ${b.className} ${
                          style.bgId === b.id
                            ? "border-indigo-600 ring-2 ring-indigo-200"
                            : "border-white shadow"
                        }`}
                        aria-label={b.label}
                      />
                    ))}
                  </div>
                </Section>

                <Section label="Text color">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setStyle((s) => ({ ...s, colorId: c.id }))}
                        className={`shrink-0 h-10 w-10 rounded-full border-2 ${c.swatch} ${
                          style.colorId === c.id
                            ? "border-indigo-600 ring-2 ring-indigo-200"
                            : "border-slate-200"
                        }`}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </Section>

                <Section label="Font">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {FONT_PRESETS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setStyle((s) => ({ ...s, fontId: f.id }))}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm border ${f.className} ${
                          style.fontId === f.id
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="Size">
                  <div className="flex gap-2">
                    {SIZE_PRESETS.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => setStyle((s) => ({ ...s, sizeId: z.id }))}
                        className={`h-10 w-10 rounded-full text-sm font-semibold border ${
                          style.sizeId === z.id
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="Align">
                  <div className="flex gap-2">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setStyle((s) => ({ ...s, align: a }))}
                        className={`flex-1 px-3 py-2 rounded-full text-sm font-medium border capitalize ${
                          style.align === a
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>
            </>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a title"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write a caption"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {post?.media_type === "video" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Thumbnail
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">No image</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {post?.media_url && (
                        <button
                          onClick={() => setPickerOpen(true)}
                          disabled={uploading}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 px-3 py-1.5 rounded-lg active:scale-95 disabled:opacity-50"
                        >
                          <Film className="h-4 w-4" />
                          Pick from video
                        </button>
                      )}
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading…" : "Upload image"}
                      </button>
                      {thumbnailUrl && (
                        <button
                          onClick={() => setThumbnailUrl(null)}
                          className="text-xs text-rose-600 font-semibold text-left"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {post?.media_url && post.media_type === "video" && (
        <VideoThumbnailPicker
          videoSrc={post.media_url}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(file) => {
            void uploadThumbFile(file);
          }}
        />
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}
