import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useHistoryBackClose } from "@/hooks/use-history-back-close";
import { Layout } from "../components/Layout";
import { UploadCloud, Loader2, Image as ImageIcon, Video as VideoIcon, X, Camera, FolderOpen, Film, MoreVertical, Upload, Globe2, Lock, Users, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/resumable-upload";
import { Progress } from "@/components/ui/progress";
import { CameraCapture } from "@/components/CameraCapture";
import { VideoThumbnailPicker } from "@/components/VideoThumbnailPicker";
import { FullscreenVideoEditor } from "@/components/FullscreenVideoEditor";
import { useServerFn } from "@tanstack/react-start";
import { publishPost } from "@/lib/moderate.functions";


export const Route = createFileRoute("/upload")({ component: UploadPage });

// Capture a still frame from a video File as a JPEG Blob (client-side, for moderation).
async function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
      v.onloadedmetadata = () => {
        const target = Math.min(1, Math.max(0.1, (v.duration || 2) * 0.25));
        try { v.currentTime = target; } catch { resolve(null); cleanup(); }
      };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          const w = v.videoWidth || 320;
          const h = v.videoHeight || 240;
          const scale = Math.min(1, 512 / Math.max(w, h));
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext("2d");
          if (!ctx) { resolve(null); cleanup(); return; }
          ctx.drawImage(v, 0, 0, c.width, c.height);
          c.toBlob((b) => { resolve(b); cleanup(); }, "image/jpeg", 0.8);
        } catch { resolve(null); cleanup(); }
      };
      v.onerror = () => { resolve(null); cleanup(); };
    } catch { resolve(null); }
  });
}


const CATEGORIES = ["For You", "Trending", "Music", "Food", "Travel"];
const MAX_BYTES = 500 * 1024 * 1024; // 500MB
const isVideoFile = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name);
const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name);

function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbTitle, setThumbTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("For You");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const isPrivate = visibility === "private";
  const setIsPrivate = (v: boolean) => setVisibility(v ? "private" : "public");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCamera, setShowCamera] = useState(true);
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const closeFullscreenPreview = useHistoryBackClose(() => setFullscreenPreviewOpen(false), fullscreenPreviewOpen);
  const [uploadPrivacyOpen, setUploadPrivacyOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryImgRef = useRef<HTMLInputElement>(null);
  const galleryVidRef = useRef<HTMLInputElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !loading && !user) navigate({ to: "/auth" });
  }, [mounted, user, loading, navigate]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Don't auto-open the cover picker; user opens it from the ⋮ menu.
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!thumbFile) { setThumbPreview(null); return; }
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!isImageFile(f) && !isVideoFile(f)) {
      toast.error("Only images and videos are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 500MB");
      return;
    }
    setFile(f);
  };

  const onPickThumb = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Thumbnail must be an image");
    if (f.size > 10 * 1024 * 1024) return toast.error("Thumbnail must be under 10MB");
    setThumbFile(f);
  };

  const moderateFn = useServerFn(moderateImage);

  const handleUpload = async () => {
    if (!user || !file) return;
    setUploading(true);
    setProgress(0);
    try {
      const mediaType = isVideoFile(file) ? "video" : "image";

      // ---- Content moderation (visual) ----
      // For images: upload to storage first, moderate the public URL, delete if unsafe.
      // For videos: capture a client-side frame, upload the frame, moderate it; delete on unsafe.
      let modUrl: string | null = null;
      let modPath: string | null = null;
      let modFrameForThumb: Blob | null = null;

      if (mediaType === "image") {
        const ext = file.name.split(".").pop() || "jpg";
        modPath = `${user.id}/mod/${Date.now()}.${ext}`;
        await uploadToStorage({ bucket: "media", path: modPath, file });
        modUrl = supabase.storage.from("media").getPublicUrl(modPath).data.publicUrl;
      } else {
        toast.message("Checking video…");
        const frame = await captureVideoFrame(file);
        if (frame) {
          modFrameForThumb = frame;
          modPath = `${user.id}/mod/${Date.now()}-frame.jpg`;
          const frameFile = new File([frame], "frame.jpg", { type: "image/jpeg" });
          await uploadToStorage({ bucket: "media", path: modPath, file: frameFile });
          modUrl = supabase.storage.from("media").getPublicUrl(modPath).data.publicUrl;
        }
      }

      if (modUrl) {
        try {
          const result = await moderateFn({ data: { imageUrl: modUrl, kind: mediaType } });
          if (!result.safe) {
            try { if (modPath) await supabase.storage.from("media").remove([modPath]); } catch {}
            toast.error(
              `This ${mediaType} was blocked by our safety filter (${result.reason ?? "unsafe"}). Please choose different content.`
            );
            setUploading(false);
            return;
          }
        } catch (e) {
          console.warn("moderation call failed, allowing upload:", e);
        }
      }

      // ---- Actual publish upload ----
      let publicUrl: string;
      let mediaPath: string;
      if (mediaType === "image" && modPath && modUrl) {
        // Reuse the moderated image as the published media (avoids re-upload).
        mediaPath = modPath;
        publicUrl = modUrl;
      } else {
        const ext = file.name.split(".").pop() || "bin";
        mediaPath = `${user.id}/${Date.now()}.${ext}`;
        await uploadToStorage({
          bucket: "media",
          path: mediaPath,
          file,
          onProgress: (pct) => setProgress(pct),
        });
        publicUrl = supabase.storage.from("media").getPublicUrl(mediaPath).data.publicUrl;
      }

      let thumbnailUrl: string | null = null;
      if (thumbFile) {
        const text = thumbFile.name.split(".").pop() || "jpg";
        const tpath = `${user.id}/thumbs/${Date.now()}.${text}`;
        await uploadToStorage({ bucket: "media", path: tpath, file: thumbFile });
        thumbnailUrl = supabase.storage.from("media").getPublicUrl(tpath).data.publicUrl;
      } else if (mediaType === "video" && modUrl) {
        // Reuse the moderated frame as the auto-thumbnail.
        thumbnailUrl = modUrl;
        void modFrameForThumb; // keep reference alive
      }

      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType,
        title: title.trim() || null,
        thumbnail_url: thumbnailUrl,
        thumbnail_title: thumbTitle.trim() || null,
        caption: caption.trim() || null,
        category,
        is_private: isPrivate,
      } as any);
      if (insErr) throw insErr;
      toast.success("Uploaded!");
      navigate({ to: "/" });
    } catch (e) {
      console.error(e);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };


  if (!mounted || loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onPickGallery={() => { setShowCamera(false); galleryVidRef.current?.click(); }}
          onCapture={(f) => { setShowCamera(false); onPick(f); }}
        />
      )}
      <div className="max-w-xl mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold mb-1">Upload</h1>
            <p className="text-sm text-slate-500">Share a photo or video with the community.</p>
          </div>
          <button
            onClick={() => { if (window.history.length > 1) window.history.back(); else navigate({ to: "/" }); }}
            disabled={uploading}
            aria-label="Close"
            className="shrink-0 h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {!file ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => galleryVidRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl py-8 flex flex-col items-center justify-center text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                >
                  <FolderOpen className="h-8 w-8 mb-2 text-indigo-500" />
                  <span className="font-semibold text-slate-700 text-sm">Gallery</span>
                  <span className="text-[11px] mt-0.5 text-slate-500">Pick a video</span>
                </button>
                <button
                  onClick={() => setShowCamera(true)}
                  className="border-2 border-dashed border-slate-300 rounded-xl py-8 flex flex-col items-center justify-center text-slate-600 hover:border-rose-400 hover:bg-rose-50/30 transition"
                >
                  <Camera className="h-8 w-8 mb-2 text-rose-500" />
                  <span className="font-semibold text-slate-700 text-sm">Record</span>
                  <span className="text-[11px] mt-0.5 text-slate-500">Open camera</span>
                </button>
              </div>
              <button
                onClick={() => galleryImgRef.current?.click()}
                className="w-full border border-slate-200 rounded-xl py-3 flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
              >
                <ImageIcon className="h-4 w-4 text-indigo-500" />
                Or choose a photo
              </button>
              <p className="text-[11px] text-center text-slate-400">Images or videos · up to 500MB</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black min-h-[240px] flex items-center justify-center">
              {isVideoFile(file) ? (
                <video
                  key={preview ?? "v"}
                  src={preview ?? undefined}
                  controls
                  playsInline
                  muted
                  autoPlay
                  loop
                  preload="auto"
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  onLoadedData={(e) => { e.currentTarget.play().catch(() => {}); }}
                  className="w-full max-h-80 object-contain bg-black"
                />

              ) : (
                <img src={preview ?? undefined} alt="preview" className="w-full max-h-80 object-contain" />
              )}
              <button
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
              {isVideoFile(file) && (
                <button
                  onClick={() => setVideoMenuOpen(true)}
                  className="absolute top-2 right-12 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
              {thumbPreview && isVideoFile(file) && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  <img src={thumbPreview} alt="thumb" className="h-5 w-5 rounded object-cover" />
                  <span>Thumbnail set</span>
                </div>
              )}
              {!isVideoFile(file) && (
                <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  <ImageIcon className="h-3 w-3" />
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <input
            ref={galleryImgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <input
            ref={galleryVidRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) return;
              e.currentTarget.value = "";
              onPick(f);
            }}
          />
          <input
            ref={cameraPhotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraVideoRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Give your video a title..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          <input
            ref={thumbRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickThumb(e.target.files?.[0] ?? null)}
          />

          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading…</span>
                <span className="font-semibold tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="pt-1 space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setVisibilityOpen(true)}
                disabled={uploading}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition active:bg-slate-50 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = visibility === "private" ? Lock : Globe2;
                    return <Icon className="h-4 w-4 text-slate-500" />;
                  })()}
                  <span className="text-sm font-semibold text-slate-800 capitalize">{visibility}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {visibilityOpen && (
                <div
                  className="fixed inset-0 z-[300] bg-black/40 flex items-end sm:items-center justify-center"
                  onClick={() => setVisibilityOpen(false)}
                >
                  <div
                    className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-5 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800">Who can see this?</p>
                    </div>
                    {([
                      { key: "public", label: "Public", Icon: Globe2, hint: "Anyone on VIP Life" },
                      { key: "private", label: "Private", Icon: Lock, hint: "Only you" },
                    ] as const).map(({ key, label, Icon, hint }) => {
                      const active = visibility === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setVisibility(key); setVisibilityOpen(false); }}
                          className="w-full flex items-center justify-between px-5 py-3.5 text-left border-b border-slate-100 last:border-b-0 active:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${active ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${active ? "text-indigo-700" : "text-slate-800"}`}>{label}</p>
                              <p className="text-xs text-slate-500">{hint}</p>
                            </div>
                          </div>
                          {active && (
                            <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setVisibilityOpen(false)}
                      className="w-full py-3.5 text-sm font-semibold text-slate-600 border-t border-slate-100 active:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:shadow-none transition active:scale-[0.99]"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {progress}%</>
              ) : (
                <><UploadCloud className="h-5 w-5" /> Upload Video</>
              )}
            </button>
          </div>



        </div>
      </div>

      {file && isVideoFile(file) && preview && (
        <VideoThumbnailPicker
          videoSrc={preview}
          open={framePickerOpen}
          onClose={() => setFramePickerOpen(false)}
          onPick={(f) => setThumbFile(f)}
        />
      )}

      {fullscreenPreviewOpen && file && isVideoFile(file) && preview && (
        <div className="fixed inset-0 z-[250] bg-black flex items-center justify-center">
          <video
            src={preview}
            controls
            playsInline
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain bg-black"
          />
          <button
            onClick={closeFullscreenPreview}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setVideoMenuOpen(true)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 right-6 inline-flex items-center rounded-full bg-indigo-600 shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => { setIsPrivate(false); handleUpload(); }}
              disabled={!file || uploading}
              className={`inline-flex items-center gap-1 px-3 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
                !isPrivate ? "bg-white/25 text-white" : "text-indigo-100 hover:bg-white/10"
              }`}
              aria-label="Upload as Public"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Public
            </button>
            <div className="w-px h-4 bg-indigo-400/50" />
            <button
              type="button"
              onClick={() => { setIsPrivate(true); handleUpload(); }}
              disabled={!file || uploading}
              className={`inline-flex items-center gap-1 px-3 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
                isPrivate ? "bg-white/25 text-white" : "text-indigo-100 hover:bg-white/10"
              }`}
              aria-label="Upload as Private"
            >
              <Lock className="h-3.5 w-3.5" />
              Private
            </button>
            <div className="w-px h-4 bg-indigo-400/50" />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              aria-label="Upload"
            >
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</> : <><Upload className="h-4 w-4" /> Upload</>}
            </button>
          </div>
        </div>
      )}

      {videoMenuOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setVideoMenuOpen(false)}
        >
          <div
            className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setVideoMenuOpen(false); if (file) setEditorFile(file); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Film className="h-5 w-5" />
              Edit
            </button>
            <div className="border-b border-slate-100 px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Say something about it..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Category</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        category === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 active:bg-slate-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setVideoMenuOpen(false); setFramePickerOpen(true); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Film className="h-5 w-5" />
              Choose thumbnail from video
            </button>
            <button
              onClick={() => { setVideoMenuOpen(false); thumbRef.current?.click(); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Upload className="h-5 w-5" />
              Upload thumbnail image
            </button>
            <button
              onClick={() => setVideoMenuOpen(false)}
              className="w-full py-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editorFile && (
        <FullscreenVideoEditor
          file={editorFile}
          onClose={() => setEditorFile(null)}
          onConfirm={(editedFile) => { setEditorFile(null); setFile(editedFile); setFullscreenPreviewOpen(false); toast.success("Video cropped — ready to upload"); }}
        />
      )}
    </Layout>
  );
}
