import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/resumable-upload";
import { moderateMedia } from "@/lib/moderation-bridge";
import { useHistoryBackClose } from "@/hooks/use-history-back-close";

type Photo = { id: string; photo_url: string; photo_path: string; position: number };
const MAX = 7;

export function MarriageAlbum({ ownerId, isSelf }: { ownerId: string; isSelf: boolean }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Photo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const table = () => supabase.from("marriage_photos" as never) as any;

  const load = async () => {
    const { data, error } = await table()
      .select("id, photo_url, photo_path, position")
      .eq("user_id", ownerId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error) setPhotos((data ?? []) as Photo[]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isSelf || busy) return;
    if (photos.length >= MAX) {
      toast.error("Maximum 7 photos allowed");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${ownerId}/marriage/album/${Date.now()}.${ext}`;
      await uploadToStorage({ bucket: "media", path, file });
      const verdict = await moderateMedia({ bucket: "media", path, mediaType: "image", surface: "other" });
      if (!verdict.safe) {
        toast.error(
          `Photo rejected by our safety filter (${verdict.reason ?? "inappropriate"}). Nude or sexually suggestive images are not allowed.`,
          { duration: 6000 },
        );
        return;
      }
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      const used = new Set(photos.map((p) => p.position));
      let position = 0;
      while (used.has(position) && position < MAX - 1) position++;
      const { error } = await table().insert({ user_id: ownerId, photo_url: url, photo_path: path, position });
      if (error) {
        await supabase.storage.from("media").remove([path]);
        throw error;
      }
      await load();
    } catch (err) {
      console.error("Album upload failed:", err);
      toast.error((err as Error)?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Photo) => {
    const { error } = await table().delete().eq("id", p.id);
    if (error) {
      toast.error("Could not delete photo");
      return;
    }
    await supabase.storage.from("media").remove([p.photo_path]);
    setPreview(null);
    setPhotos((list) => list.filter((x) => x.id !== p.id));
  };

  if (!isSelf && photos.length === 0) return null;

  return (
    <>
      <div className="-mx-2 mt-3 flex h-[120px] items-center gap-[9px] overflow-x-auto rounded-[20px] border border-[#19D66B] bg-[#005A35] px-[10px]">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreview(p)}
            className="h-[70px] w-[75px] shrink-0 overflow-hidden rounded-[10px] bg-[#003D25]"
            aria-label="Open photo"
          >
            <img src={p.photo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
          </button>
        ))}
        {isSelf && photos.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-[70px] w-[75px] shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#19D66B] text-xs text-white/80"
            aria-label="Add photo"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
            <span>{busy ? "Uploading" : `Add Photo ${photos.length}/${MAX}`}</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      </div>
      {preview && (
        <Preview photo={preview} isSelf={isSelf} onClose={() => setPreview(null)} onDelete={() => remove(preview)} />
      )}
    </>
  );
}

function Preview({
  photo,
  isSelf,
  onClose,
  onDelete,
}: {
  photo: Photo;
  isSelf: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  useHistoryBackClose(onClose, true);
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={onClose}>
      <img
        src={photo.photo_url}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <X className="h-5 w-5" />
      </button>
      {isSelf && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete photo"
          className="absolute bottom-6 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-4 text-sm text-white"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      )}
    </div>,
    document.body,
  );
}
