import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, createContext, useContext } from "react";
import { Home, User, Bell, LogOut, LogIn, Menu, Languages, Check, Loader2, Search, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth, signOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n, LANGUAGES, type LangCode } from "@/lib/i18n";
import { useGlobalPresence } from "@/lib/presence";
import logoUrl from "@/assets/logo.png";
import chatIconUrl from "@/assets/chat-icon.png";
import feedIconUrl from "@/assets/feed-icon.jpeg";

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
}

export const SearchContext = createContext<SearchContextType>({
  query: "",
  setQuery: () => {},
});

const FeedIcon = ({ className }: { className?: string }) => (
  <img src={feedIconUrl} alt="Feed" className={`${className ?? ""} object-contain`} />
);

const navItems = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/u/$id", labelKey: "nav.profile", icon: User },] as const;

const NOTIF_SEEN_KEY = "viplife.notifSeenAt";
const NOTIFICATION_POST_LIMIT = 200;

export function Layout({
  children,
  hideMobileNav = false,
  fullScreenMobile = false,
}: {
  children: React.ReactNode;
  hideMobileNav?: boolean;
  fullScreenMobile?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [homeReloading, setHomeReloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Safety net: an overlay that unmounts mid-navigation can leave the page
  // scroll-locked (body overflow/pointer-events), which looks like a freeze.
  // Clear it on every route change.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.style.position = "";
  }, [path]);

  const refreshUnreadMsgs = useCallback(async () => {
    if (!userId) return setUnreadMsgs(0);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    setUnreadMsgs(count ?? 0);
  }, [userId]);

  const refreshUnreadNotifs = useCallback(async () => {
    if (!userId) return setUnreadNotifs(0);
    const seen = localStorage.getItem(NOTIF_SEEN_KEY) ?? new Date(0).toISOString();
    try {
      // Keep this badge refresh bounded. The old query loaded every post the
      // account had ever created and expanded all IDs into two request URLs
      // immediately after login, which could stall mobile browsers.
      const [followsResult, postsResult] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId)
          .gt("created_at", seen),
        supabase
          .from("posts")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(NOTIFICATION_POST_LIMIT),
      ]);
      const ids = (postsResult.data ?? []).map((post) => post.id);
      let likes = 0;
      let comments = 0;
      if (ids.length) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase.from("post_likes").select("id", { count: "exact", head: true })
            .in("post_id", ids).neq("user_id", userId).gt("created_at", seen),
          supabase.from("post_comments").select("id", { count: "exact", head: true })
            .in("post_id", ids).neq("user_id", userId).gt("created_at", seen),
        ]);
        likes = likesResult.count ?? 0;
        comments = commentsResult.count ?? 0;
      }
      setUnreadNotifs((followsResult.count ?? 0) + likes + comments);
    } catch (error) {
      console.error("Notification badge refresh failed:", error);
    }
  }, [userId]);

  // Keep the user "online" across all routes; only drops when tab is closed.
  useGlobalPresence(user?.id ?? null);

  useEffect(() => {
    if (!userId) {
      setUnreadMsgs(0);
      setUnreadNotifs(0);
      return;
    }
    // Feed rendering and navigation are the critical post-login path. Start
    // badge reads on the next task so they cannot hold up the first usable UI.
    const startId = window.setTimeout(() => {
      void refreshUnreadMsgs();
      void refreshUnreadNotifs();
    }, 250);
    const ch = supabase
      .channel("layout-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        refreshUnreadMsgs,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` },
        refreshUnreadMsgs,
      )

      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${userId}` },
        refreshUnreadNotifs,
      )
      .subscribe();
    return () => {
      window.clearTimeout(startId);
      supabase.removeChannel(ch);
    };
  }, [userId, refreshUnreadMsgs, refreshUnreadNotifs]);

  // Likes/comments cannot be filtered by post ownership at the Realtime
  // subscription level. Listening to those tables globally made every client
  // refresh its badge for every user's activity, creating an app-wide query
  // storm. Refresh once when the app returns to the foreground instead.
  useEffect(() => {
    if (!userId) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshUnreadNotifs();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [userId, refreshUnreadNotifs]);

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

  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const sortedLangs = useMemo(
    () => [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  const [searchQuery, setSearchQuery] = useState("");


  return (
    <SearchContext.Provider value={{ query: searchQuery, setQuery: setSearchQuery }}>
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${hideMobileNav ? "" : "pb-24 md:pb-0"}`}>

      <header className={`sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 ${fullScreenMobile ? "hidden md:block" : ""}`}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-[68px] flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoUrl} alt="VIP Life logo" className="h-12 w-12 rounded-xl object-contain" />
            <div className="leading-tight hidden xs:block sm:block">
              <div className="font-extrabold text-base tracking-tight">VIP</div>
              <div className="font-extrabold text-base -mt-1 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                LIFE
              </div>
            </div>
          </Link>

          {/* Search trigger — opens dedicated search page */}
          <div className="flex-1 flex justify-center px-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate({ to: "/search", search: { q: "", tab: "all" } })}
              className="group flex items-center gap-2 h-11 w-full max-w-md px-4 rounded-full bg-gradient-to-r from-indigo-50 to-pink-50 hover:from-indigo-100 hover:to-pink-100 border border-indigo-100 transition shadow-sm"
              aria-label="Search"
            >
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow">
                <Search className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-sm font-medium text-slate-500 truncate">
                Search VIP Life…
              </span>
            </button>
          </div>


          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {navItems.map((item) => {
              const active = path === item.to;
              return (
                <Link
               key={item.to}
               to={item.to}
              params={item.to === "/u/$id" && userId ? { id: userId } : undefined}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              active
           ? "text-indigo-600 bg-indigo-50"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          >
          {t(item.labelKey)}
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
            {mounted && user && (
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
              </>
            )}
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setLangOpen(true)}>
                  <Languages className="h-4 w-4 mr-2" /> {t("menu.language")}
                </DropdownMenuItem>
                {mounted && user && (
                  <>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" /> {t("menu.signOut")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {mounted && !user && (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">{t("common.signIn")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-md">
          <DialogTitle className="sr-only">{t("language.title")}</DialogTitle>
          <Command>
            <CommandInput placeholder={t("language.searchPlaceholder")} />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>—</CommandEmpty>
              {sortedLangs.map((l) => (
                <CommandItem
                  key={l.code}
                  value={`${l.name} ${l.native}`}
                  onSelect={() => {
                    setLang(l.code as LangCode);
                    setLangOpen(false);
                  }}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{l.native}</span>
                    <span className="text-xs text-slate-500">{l.name}</span>
                  </span>
                  {lang === l.code && <Check className="h-4 w-4 text-indigo-600" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

  <main
  className={
    fullScreenMobile
      ? "fixed inset-0 z-40 overflow-hidden bg-white md:static md:z-auto md:h-auto md:overflow-visible md:max-w-6xl md:mx-auto md:px-4 md:py-6"
      : "max-w-6xl mx-auto px-3 sm:px-4 py-6"
  }
>
  {children}
</main>

{!hideMobileNav && (
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative grid grid-cols-3 items-end">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = path === item.to;
            const isHome = item.to === "/";
            const showSpinner = isHome && homeReloading;
            // Insert the + button visually in the middle column by ordering
            const colClass = idx === 0 ? "col-start-1" : "col-start-3";
            return (
              <Link
                key={item.to}
                to={item.to === "/u/$id" && !userId ? "/auth" : item.to}
                params={item.to === "/u/$id" && userId ? { id: userId } : undefined}
                onClick={async (e) => {
                  if (isHome) {
                    e.preventDefault();
                    setHomeReloading(true);
                    const scrollTop = () => {
                      try {
                        document.body.style.overflow = "";
                        document.body.style.pointerEvents = "";
                        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                        document
                          .querySelectorAll<HTMLElement>("main, [data-scroll-root]")
                          .forEach((el) => {
                            el.scrollTop = 0;
                          });
                      } catch {}
                    };
                    try {
                      if (path !== "/") {
                        await navigate({ to: "/" });
                      } else {
                        window.dispatchEvent(new CustomEvent("home:refresh"));
                      }
                      scrollTop();
                      requestAnimationFrame(scrollTop);
                    } finally {
                      setTimeout(() => setHomeReloading(false), 400);
                    }
                  }
                }}
                className={`${colClass} row-start-1 flex flex-col items-center justify-end py-2 text-xs font-medium transition ${
                  active ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="h-8 w-8 flex items-center justify-center mb-1">
                  {showSpinner ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </span>
                {t(item.labelKey)}
              </Link>
            );
          })}

          {/* Center + button: upload photo/video */}
          <Link
            to={user ? "/upload" : "/auth"}
            aria-label="Upload photo or video"
            className="col-start-2 row-start-1 flex flex-col items-center justify-end py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <span className="h-8 w-8 flex items-center justify-center mb-1">
              <span className="h-8 w-8 rounded-full bg-[#057543] shadow-md shadow-indigo-500/30 ring-2 ring-white flex items-center justify-center transition-transform active:scale-95">
                <Plus className="h-4 w-4 text-white" strokeWidth={3} />
              </span>
            </span>
            Upload
          </Link>
        </div>
      </nav>
      )}
    </div>
    </SearchContext.Provider>
  );
}
