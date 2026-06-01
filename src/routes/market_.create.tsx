import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { UploadCloud, Loader2, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/market_/create")({
  component: CreateMarketProductPage,
  head: () => ({ meta: [{ title: "Post a Product — VIP Life Market" }] }),
});

const CATEGORIES = ["fashion", "electronics", "home", "beauty"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

function CreateMarketProductPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("fashion");
  const [submitting, setSubmitting] = useState(false);
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
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > MAX_BYTES) return toast.error("Image must be under 10MB");
    setFile(f);
  };

  const parseTags = (raw: string) =>
    raw.split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, 10);

  const handleSubmit = async () => {
    if (!user) return;
    if (!file) return toast.error("Add a product image");
    if (!title.trim()) return toast.error("Add a product title");

    // Validate affiliate URL only if provided
    if (affiliateUrl.trim()) {
      try {
        new URL(affiliateUrl);
      } catch {
        return toast.error("Affiliate link must be a valid URL");
      }
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `market/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);

      const { error: insErr } = await supabase.from("market_products").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        image_url: pub.publicUrl,
        affiliate_url: affiliateUrl.trim() || null,
        price: null,
        old_price: null,
        hashtags: parseTags(hashtags),
        category,
      });
      if (insErr) throw insErr;

      toast.success("Product published!");
      navigate({ to: "/market" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to publish");
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center gap-2 mb-4">
          <Link to="/market" className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-extrabold">Post a Product</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {!file ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-12 flex flex-col items-center justify-center text-slate-500 hover:border-violet-400 hover:bg-violet-50/30 transition"
            >
              <UploadCloud className="h-10 w-10 mb-2 text-violet-500" />
              <span className="font-semibold text-slate-700">Tap to upload product image</span>
              <span className="text-xs mt-1">JPG / PNG · up to 10MB</span>
            </button>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-100">
              <img src={preview ?? undefined} alt="preview" className="w-full max-h-80 object-contain" />
              <button
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)} />

          <Field label="Product title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              placeholder="e.g. Nike Air Force 1" className={inputCls} />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
              rows={3} placeholder="Why people will love it…" className={inputCls} />
          </Field>

          <Field label="Hashtags">
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)}
              placeholder="#sneakers #fashion #deal" className={inputCls} />
          </Field>

          <Field label="Affiliate link">
            <input value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)}
              type="url" placeholder="https://amazon.com/..." className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01"
                placeholder="120" className={inputCls} />
            </Field>
            <Field label="Old price ($)">
              <input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} type="number" min="0" step="0.01"
                placeholder="150" className={inputCls} />
            </Field>
          </div>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                    category === c ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>{c}</button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <button onClick={() => navigate({ to: "/market" })} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
