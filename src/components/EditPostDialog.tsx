import { useEffect, useRef, useState } from "react";
import { X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Props = {
  postId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (updates: {
    caption?: string | null;
    title?: string | null;
    thumbnail_url?: string | null;
  }) => void;
};

type PostRow = {
  id: string;
  user_id: string;
  media_type: "image" | "video" | "text";
  caption: string | null;
  title: string | null;
  thumbnail_url: string | null;
};

export function EditPostDialog({ postId, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [post, setPost] = useState<PostRow | null>(null);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("posts")
      .select("id,user_id,media_type,caption,title,thumbnail_url")
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
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId, onClose]);

  if (!open) return null;

  const isOwner = !!user && !!post && user.id === post.user_id;

  const handlePickThumbnail = () => fileRef.current?.click();

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/thumbnails/${postId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploading(false);
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
    const { error } = await supabase.from("posts").update(updates).eq("id", postId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save changes");
      return;
    }
    toast.success("Post updated");
    onSaved?.(updates);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Edit post</h3>
          <button onClick={onClose} className="text-slate-500 active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : !isOwner ? (
          <div className="p-8 text-center text-sm text-rose-600">
            You can only edit your own posts.
          </div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Caption</label>
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
                      <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No image</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handlePickThumbnail}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading…" : "Change"}
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

        {isOwner && !loading && (
          <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 active:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 active:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
