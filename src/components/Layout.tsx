import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Home, User, Bell, LogOut, LogIn, Store, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, signOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.png";
import chatIconUrl from "@/assets/chat-icon.png";
import feedIconUrl from "@/assets/feed-icon.jpeg";

const FeedIcon = ({ className }: { className?: string }) => (
  <img src={feedIconUrl} alt="Feed" className={`${className ?? ""} object-contain`} />
);

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/videos", label: "Feed", icon: FeedIcon },
  { to: "/market", label: "Market", icon: Store },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const NOTIF_SEEN_KEY = "viplife.notifSeenAt";

export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const refreshUnreadMsgs = useCallback(async () => {
    if (!user) return setUnreadMsgs(0);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    setUnreadMsgs(count ?? 0);
  }, [user]);

  const refreshUnreadNotifs = useCallback(async () => {
    if (!user) return setUnreadNotifs(0);
    const seen = localStorage.getItem(NOTIF_SEEN_KEY) ?? new Date(0).toISOString();
    // followers (new)
    const followsP = supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id)
      .gt("created_at", seen);
    // likes & comments on my posts
    const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", user.id);
    const ids = (myPosts ?? []).map((p) => p.id);
    let likes = 0, comments = 0;
    if (ids.length) {
      const [lk, cm] = await Promise.all([
        supabase.from("post_likes").select("id", { count: "exact", head: true })
          .in("post_id", ids).neq("user_id", user.id).gt("created_at", seen),
        supabase.from("post_comments").select("id", { count: "exact", head: true })
          .in("post_id", ids).neq("user_id", user.id).gt("created_at", seen),
      ]);
      likes = lk.count ?? 0;
      comments = cm.count ?? 0;
    }
    const { count: foll } = await followsP;
    setUnreadNotifs((foll ?? 0) + likes + comments);
  }, [user]);

  useEffect(() => {
    refreshUnreadMsgs();
    refreshUnreadNotifs();
    if (!user) return;
    const ch = supabase
      .channel("layout-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, refreshUnreadMsgs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` }, refreshUnreadNotifs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, refreshUnreadNotifs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments" }, refreshUnreadNotifs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refreshUnreadMsgs, refreshUnreadNotifs]);

  // Reset notif badge when visiting the notifications page
  useEffect(() => {
    if (path === "/notifications") {
      localStorage.setItem(NOTIF_SEEN_KEY, new Date().toISOString());
      setUnreadNotifs(0);
    }
  }, [path]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-0">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-[68px] flex items-center justify-between gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoUrl} alt="VIP Life logo" className="h-12 w-12 rounded-xl object-contain" />
            <div className="leading-tight hidden xs:block sm:block">
              <div className="font-extrabold text-base tracking-tight">VIP</div>
              <div className="font-extrabold text-base -mt-1 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                LIFE
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = path === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    active ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/notifications"
              className="relative h-12 w-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
              aria-label="Notifications"
            >
              <Bell className="h-7 w-7" />
              <Badge n={unreadNotifs} />
            </Link>
            {user ? (
              <>
                <Link
                  to="/messages"
                  search={{ to: undefined }}
                  className="relative h-12 w-12 rounded-full hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Messages"
                >
                  <img src={chatIconUrl} alt="Chat" className="h-10 w-10 object-contain" />
                  <Badge n={unreadMsgs} />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Menu"
                      className="relative h-12 w-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      <Menu className="h-7 w-7" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                      <User className="h-4 w-4 mr-2" /> About
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6">{children}</main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition ${
                  active ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
