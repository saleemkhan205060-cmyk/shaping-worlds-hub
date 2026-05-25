import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Store, Search, ShoppingBag, Tag, Truck, Heart, Star, ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/market")({
  component: MarketPage,
  head: () => ({
    meta: [
      { title: "Market — VIP Style" },
      { name: "description", content: "Shop premium products and discover great deals." },
    ],
  }),
});

const CATEGORIES = [
  { icon: ShoppingBag, label: "Fashion", tint: "from-pink-500 to-rose-500" },
  { icon: Package, label: "Electronics", tint: "from-sky-500 to-indigo-500" },
  { icon: Tag, label: "Offers", tint: "from-amber-500 to-orange-500" },
  { icon: Truck, label: "Delivery", tint: "from-emerald-500 to-teal-500" },
  { icon: Heart, label: "Wishlist", tint: "from-rose-500 to-red-500" },
  { icon: Star, label: "Top Rated", tint: "from-yellow-400 to-amber-500" },
];

const PRODUCTS = [
  { name: "Premium Watch", price: "$129", c: "from-slate-700 to-slate-900" },
  { name: "Wireless Buds", price: "$59", c: "from-indigo-500 to-purple-600" },
  { name: "Designer Bag", price: "$89", c: "from-pink-500 to-rose-600" },
  { name: "Smart Lamp", price: "$39", c: "from-amber-400 to-orange-500" },
];

function MarketPage() {
  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow">
            <Store className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Market</h1>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search products, brands, categories…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <section className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {CATEGORIES.map(({ icon: Icon, label, tint }) => (
          <button key={label} className="flex flex-col items-center gap-2">
            <span className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow`}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold text-slate-700">{label}</span>
          </button>
        ))}
      </section>

      <h2 className="font-bold mb-3">Trending Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRODUCTS.map((p) => (
          <div key={p.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`aspect-square bg-gradient-to-br ${p.c}`} />
            <div className="p-3">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-sm text-amber-600 font-bold">{p.price}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
