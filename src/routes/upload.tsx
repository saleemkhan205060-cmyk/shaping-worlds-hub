import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { UploadCloud, Loader2, Image as ImageIcon, Video as VideoIcon, X, Camera, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PostPrivacySettings } from "@/components/PostPrivacySettings";
import { uploadToStorage } from "@/lib/resumable-upload";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const CATEGORIES = ["For You", "Trending", "Music", "Food", "Travel"];
const MAX_BYTES = 500 * 1024 * 1024; // 500MB

function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("For You");
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      toast.error("Only images and videos are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 500MB");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      await uploadToStorage({
        bucket: "media",
        path,
        file,
        onProgress: (pct) => setProgress(pct),
      });
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        media_url: pub.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
        category,
        is_private: isPrivate,
      });
      if (insErr) throw insErr;
      toast.success("Uploaded!");
      navigate({ to: mediaType === "video" ? "/videos" : "/profile" });
    } catch (e) {
      console.error(e);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
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

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-1">Upload</h1>
        <p className="text-sm text-slate-500 mb-5">Share a photo or video with the community.</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {!file ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-12 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
            >
              <UploadCloud className="h-10 w-10 mb-2 text-indigo-500" />
              <span className="font-semibold text-slate-700">Tap to choose a file</span>
              <span className="text-xs mt-1">Images or videos · up to 500MB</span>
            </button>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-100">
              {file.type.startsWith("video/") ? (
                <video src={preview ?? undefined} controls className="w-full max-h-80 object-contain bg-black" />
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
              <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {file.type.startsWith("video/") ? <VideoIcon className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Say something about it..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Category</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    category === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>


          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading…</span>
                <span className="font-semibold tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <PostPrivacySettings isPrivate={isPrivate} onChange={setIsPrivate} />
            <div className="flex gap-2">
              <button
                onClick={() => { if (window.history.length > 1) window.history.back(); else navigate({ to: "/" }); }}
                disabled={uploading}
                className="px-4 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</> : "Share"}
              </button>
            </div>
          </div>


        </div>
      </div>
    </Layout>
  );
}
