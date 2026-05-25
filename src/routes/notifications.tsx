import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Bell, Search, Heart, MessageCircle, UserPlus, ShoppingBag, Star, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — VIP Style" },
      { name: "description", content: "All your latest updates and activity." },
    ],
  }),
});

const ITEMS = [
  { icon: Heart, who: "Sara Khan", text: "liked your video", time: "2m", tint: "from-rose-500 to-pink-500" },
  { icon: MessageCircle, who: "Ali Music", text: "commented: Amazing work!", time: "10m", tint: "from-sky-500 to-indigo-500" },
  { icon: UserPlus, who: "John Doe", text: "started following you", time: "1h", tint: "from-emerald-500 to-teal-500" },
  { icon: ShoppingBag, who: "Market", text: "Your order has been shipped", time: "3h", tint: "from-amber-500 to-orange-500" },
  { icon: Star, who: "VIP Style", text: "You earned a new badge!", time: "1d", tint: "from-yellow-400 to-amber-500" },
  { icon: Heart, who: "Foodie Love", text: "liked your post", time: "2d", tint: "from-fuchsia-500 to-pink-500" },
];

function NotificationsPage() {
  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow">
            <Bell className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search notifications…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {["All", "Likes", "Comments", "Follows", "Orders"].map((t, i) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border ${
              i === 0 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {ITEMS.map((n, i) => (
          <li key={i} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
            <span className={`h-11 w-11 rounded-full bg-gradient-to-br ${n.tint} text-white flex items-center justify-center shrink-0`}>
              <n.icon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm"><span className="font-bold">{n.who}</span> {n.text}</p>
              <p className="text-xs text-slate-500">{n.time} ago</p>
            </div>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
