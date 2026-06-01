import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import {
  Search, SlidersHorizontal, Heart, Star, ExternalLink, Plus,
  ShoppingBag, Shirt, Smartphone, Home as HomeIcon, Sparkles, Tag, Flame,
  Download, Flag, Ban, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/market")({
  component: MarketPage,
  head: () => ({
    meta: [
      { title: "Market — VIP Life" },
      { name: "description", content: "Discover trending products and exclusive deals." },
    ],
  }),
});

type Category = { id: string; label: string; Icon: React.ComponentType<{ className?: string }>; color: string };

const CATEGORIES: Category[] = [
  { id: "all", label: "All", Icon: ShoppingBag, color: "text-fuchsia-600" },
  { id: "fashion", label: "Fashion", Icon: Shirt, color: "text-pink-500" },
  { id: "electronics", label: "Electronics", Icon: Smartphone, color: "text-sky-500" },
  { id: "home", label: "Home", Icon: HomeIcon, color: "text-emerald-500" },
  { id: "beauty", label: "Beauty", Icon: Sparkles, color: "text-rose-500" },
  { id: "deals", label: "Deals", Icon: Tag, color: "text-amber-500" },
  { id: "trending", label: "Trending", Icon: Flame, color: "text-orange-500" },
];

type Product = {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  price?: number;
  oldPrice?: number;
  discount?: number;
  rating?: number;
  reviews?: number;
  store: string;
  url: string;
  image: string;
  category: string;
  hashtags?: string[];
  trending?: boolean;
  userPost?: boolean;
};

const SEED_PRODUCTS: Product[] = [
  { id: "p1", title: "Nike Air Force 1 '07", description: "Comfortable, stylish & perfect for everyday wear.", price: 120, oldPrice: 150, discount: 20, rating: 4.6, reviews: 128, store: "Amazon", url: "https://www.amazon.com/s?k=nike+air+force+1", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", category: "fashion", trending: true },
  { id: "p2", title: "Smart Watch Series 8", description: "Track your fitness, health & stay connected.", price: 199, oldPrice: 280, discount: 30, rating: 4.7, reviews: 156, store: "Amazon", url: "https://www.amazon.com/s?k=smart+watch", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80", category: "electronics", trending: true },
  { id: "p3", title: "Sony WH-1000XM5 Headphones", description: "Premium sound quality with noise cancellation.", price: 279, oldPrice: 329, discount: 15, rating: 4.5, reviews: 98, store: "Amazon", url: "https://www.amazon.com/s?k=sony+wh-1000xm5", image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80", category: "electronics" },
  { id: "p4", title: "Women Handbag", description: "Trendy, elegant & perfect for every occasion.", price: 45, rating: 4.5, reviews: 96, store: "Amazon", url: "https://www.amazon.com/s?k=women+handbag", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80", category: "fashion" },
  { id: "p5", title: "Modern Sofa Chair", description: "Comfortable & stylish for your beautiful home.", price: 250, rating: 4.3, reviews: 64, store: "Amazon", url: "https://www.amazon.com/s?k=modern+sofa+chair", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", category: "home" },
  { id: "p6", title: "Summer Floral Dress", description: "Light, stylish & perfect for summer days.", price: 35, oldPrice: 50, rating: 4.6, reviews: 112, store: "Amazon", url: "https://www.amazon.com/s?k=summer+floral+dress", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80", category: "fashion", trending: true },
  { id: "p7", title: "Canon EOS DSLR Camera", description: "Capture stunning photos and 4K video.", price: 899, oldPrice: 999, discount: 10, rating: 4.8, reviews: 210, store: "Amazon", url: "https://www.amazon.com/s?k=canon+eos+dslr", image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80", category: "electronics" },
  { id: "p8", title: "Gucci Bloom Perfume", description: "Luxurious floral fragrance for women.", price: 95, oldPrice: 127, discount: 25, rating: 4.7, reviews: 88, store: "Amazon", url: "https://www.amazon.com/s?k=gucci+bloom+perfume", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80", category: "beauty" },
  { id: "p9", title: "Apple AirPods Pro", description: "Active noise cancellation, immersive sound.", price: 199, oldPrice: 249, discount: 20, rating: 4.7, reviews: 340, store: "Amazon", url: "https://www.amazon.com/s?k=airpods+pro", image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80", category: "electronics", trending: true },
];

const WISHLIST_KEY = "viplife.market.wishlist";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "fake_product", label: "Fake Product" },
  { value: "adult_content", label: "Adult Content" },
  { value: "copyright", label: "Copyright Issue" },
  { value: "scam_fraud", label: "Scam/Fraud" },
  { value: "other", label: "Other" },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]["value"];

function MarketPage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [lightbox, setLightbox] = useState<Product | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [lightbox]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      if (raw) setWishlist(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let blocked = new Set<string>();

      if (userId) {
        const { data: blockRows } = await (supabase as any)
          .from("user_blocks")
          .select("blocked_id")
          .eq("blocker_id", userId);
        blocked = new Set((blockRows || []).map((row: { blocked_id: string }) => row.blocked_id));
      }

      const { data } = await supabase
        .from("market_products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active || !data) return;
      const mapped: Product[] = data.map((r: any) => {
        const price = r.price != null ? Number(r.price) : undefined;
        const oldPrice = r.old_price != null ? Number(r.old_price) : undefined;
        const discount = price && oldPrice && oldPrice > price
          ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;
        return {
          id: r.id, title: r.title, description: r.description || "",
          user_id: r.user_id,
          price, oldPrice, discount,
          store: "Community", url: r.affiliate_url, image: r.image_url,
          category: r.category || "all",
          hashtags: r.hashtags || [],
          trending: true, userPost: true,
        };
      }).filter((product) => !product.user_id || !blocked.has(product.user_id));
      setUserProducts(mapped);
    };
    load();

    const channel = supabase
      .channel("market_products_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "market_products" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const toggleWish = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(WISHLIST_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const allProducts = useMemo(() => [...userProducts, ...SEED_PRODUCTS], [userProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (activeCat === "deals") {
        if (!p.discount) return false;
      } else if (activeCat === "trending") {
        if (!p.trending) return false;
      } else if (activeCat !== "all" && p.category !== activeCat) {
        return false;
      }
      if (q) {
        const hay = `${p.title} ${p.description} ${p.store} ${(p.hashtags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, activeCat, allProducts]);

  return (
    <Layout>
      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search products, brands, hashtags…"
            className="w-full h-12 pl-12 pr-4 rounded-full bg-white border border-slate-200 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <Link
          to="/market/create"
          className="h-12 px-4 rounded-full bg-violet-600 text-white shadow-sm flex items-center gap-1.5 text-sm font-semibold hover:bg-violet-700"
        >
          <Plus className="h-5 w-5" /> Post
        </Link>
        <button className="h-12 w-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50">
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Categories */}
      <div className="-mx-3 sm:-mx-4 px-3 sm:px-4 mb-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-1">
          {CATEGORIES.map(({ id, label, Icon, color }) => {
            const active = activeCat === id;
            return (
              <button
                key={id}
                onClick={() => setActiveCat(id)}
                className={`flex flex-col items-center justify-center w-[78px] h-[84px] rounded-2xl border bg-white transition shrink-0 ${
                  active ? "border-violet-500 ring-2 ring-violet-200 shadow-sm" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon className={`h-7 w-7 ${color}`} />
                <span className="text-xs font-semibold text-slate-700 mt-1.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-lg">
          {activeCat === "all" ? "Recommended for you" :
           activeCat === "deals" ? "Hot Deals" :
           activeCat === "trending" ? "Trending Now" :
           CATEGORIES.find((c) => c.id === activeCat)?.label}
        </h2>
        <Link to="/market/create" className="text-violet-600 text-sm font-semibold flex items-center gap-1">
          <Plus className="h-4 w-4" /> Post product
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No products match your search.</div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="mb-3 sm:mb-4 break-inside-avoid">
              <ProductCard
                product={p}
                liked={wishlist.has(p.id)}
                onToggleWish={() => toggleWish(p.id)}
                onOpen={() => setLightbox(p)}
                onBlockUser={(blockedId) => {
                  setUserProducts((prev) => prev.filter((item) => item.user_id !== blockedId));
                }}
              />
            </div>
          ))}
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl leading-none flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
          {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(lightbox.image) ? (
            <video
              src={lightbox.image}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.image}
              alt={lightbox.title}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </Layout>
  );
}

function ProductCard({
  product, liked, onToggleWish, onOpen, onBlockUser,
}: {
  product: Product;
  liked: boolean;
  onToggleWish: () => void;
  onOpen: () => void;
  onBlockUser: (blockedId: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition">
      <div className="relative">
        <MarketMediaMenu product={product} onOpen={onOpen} onBlockUser={onBlockUser}>
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-auto object-contain bg-slate-50"
            style={{ WebkitTouchCallout: "none", userSelect: "none" } as any}
          />
        </MarketMediaMenu>
        {product.discount ? (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-emerald-500">
            -{product.discount}%
          </span>
        ) : null}
        <button
          onClick={onToggleWish}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-105 transition"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : "text-slate-600"}`} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-sm leading-snug line-clamp-2">{product.title}</h3>
        {product.description ? (
          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
        ) : null}

        {product.hashtags && product.hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {product.hashtags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] font-semibold text-violet-600">#{t}</span>
            ))}
          </div>
        ) : null}

        {product.price != null ? (
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-extrabold text-violet-600 text-base">${product.price.toFixed(2)}</span>
            {product.oldPrice ? (
              <span className="text-xs text-slate-400 line-through">${product.oldPrice.toFixed(2)}</span>
            ) : null}
          </div>
        ) : null}

        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
          >
            View Deal <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}

        <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-100 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{product.store}</span>
          {product.rating != null ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-700">{product.rating}</span>
              {product.reviews != null ? <span>({product.reviews})</span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MarketMediaMenu({
  product, children, onOpen, onBlockUser,
}: {
  product: Product;
  children: React.ReactNode;
  onOpen: () => void;
  onBlockUser: (blockedId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const touchMoved = useRef(false);
  const touchHandled = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const startLongPress = () => {
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setMenuOpen(true);
    }, 450);
  };

  const handleClick = () => {
    if (touchHandled.current) {
      touchHandled.current = false;
      return;
    }
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onOpen();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    touchMoved.current = false;
    startLongPress();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    touchHandled.current = true;
    clearLongPress();
    if (!longPressTriggered.current && !touchMoved.current) onOpen();
    longPressTriggered.current = false;
  };

  const downloadImage = async () => {
    setMenuOpen(false);
    try {
      const response = await fetch(product.image);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = blob.type.split("/")[1] || "jpg";
      link.href = url;
      link.download = `${product.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "product"}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download image");
    }
  };

  const submitReport = async () => {
    setSubmitting(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      toast.error("Please sign in to report products");
      setSubmitting(false);
      return;
    }
    const { error } = await (supabase as any).from("product_reports").insert({
      product_id: product.id,
      reporter_id: userId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.info("You already reported this product");
      else toast.error("Could not submit report");
      return;
    }
    setReportOpen(false);
    setDetails("");
    setReason("spam");
    toast.success("Product reported");
  };

  const blockUser = async () => {
    setMenuOpen(false);
    if (!product.user_id) {
      toast.error("This product cannot be blocked");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      toast.error("Please sign in to block users");
      return;
    }
    const { error } = await (supabase as any).from("user_blocks").insert({
      blocker_id: userId,
      blocked_id: product.user_id,
    });
    if (error && error.code !== "23505") {
      toast.error("Could not block user");
      return;
    }
    onBlockUser(product.user_id);
    toast.success("User blocked");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
        style={{ WebkitTouchCallout: "none", userSelect: "none" } as any}
        className="block w-full"
        aria-label={`Open ${product.title}`}
      >
        {children}
      </button>

      {menuOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="w-full h-12 flex items-center gap-3 px-4 text-sm font-semibold text-slate-800" onClick={downloadImage}>
              <Download className="h-5 w-5" /> Download Image
            </button>
            <button className="w-full h-12 flex items-center gap-3 px-4 text-sm font-semibold text-slate-800" onClick={() => { setMenuOpen(false); setReportOpen(true); }}>
              <Flag className="h-5 w-5" /> Report Product
            </button>
            <button className="w-full h-12 flex items-center gap-3 px-4 text-sm font-semibold text-red-600" onClick={blockUser}>
              <Ban className="h-5 w-5" /> Block User
            </button>
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Report Product</h3>
              <button className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center" onClick={() => setReportOpen(false)} aria-label="Close report form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {REPORT_REASONS.map((item) => (
                <label key={item.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input type="radio" name={`report-${product.id}`} value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
                  {item.label}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Optional details"
              className="mt-4 w-full min-h-24 rounded-2xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              maxLength={500}
            />
            <button
              disabled={submitting}
              onClick={submitReport}
              className="mt-4 w-full h-11 rounded-2xl bg-violet-600 text-white text-sm font-bold disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
