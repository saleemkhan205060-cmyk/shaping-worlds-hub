import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, User, Bell, Search, X, LogOut, LogIn, Store, Heart } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click or route change
  useEffect(() => {
    setNotifOpen(false);
    setSearchOpen(false);
  }, [path]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(false);
    navigate({ to: "/videos" });
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-0">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              S
            </div>
            <div className="leading-tight hidden xs:block sm:block">
              <div className="font-extrabold text-sm tracking-tight">SHAPING</div>
              <div className="font-extrabold text-sm -mt-1 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                WORLD
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
            <button
              onClick={() => { setSearchOpen((o) => !o); setNotifOpen(false); }}
              className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen((o) => !o); setSearchOpen(false); }}
                  className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-40">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">Notifications</p>
                      <button onClick={() => setNotifOpen(false)} aria-label="Close"><X className="h-4 w-4 text-slate-400" /></button>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="p-2 rounded hover:bg-slate-50">Sara liked your video</li>
                      <li className="p-2 rounded hover:bg-slate-50">New follower: John Doe</li>
                      <li className="p-2 rounded hover:bg-slate-50">Your post is trending</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            {user ? (
              <>
                <Link to="/profile" className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shrink-0" aria-label="Profile" />
                <button
                  onClick={handleSignOut}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
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

        {searchOpen && (
          <div className="border-t border-slate-200 bg-white">
            <form onSubmit={onSearchSubmit} className="max-w-6xl mx-auto px-4 py-3 flex gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search videos, creators, businesses..."
                className="flex-1 px-4 py-2 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button type="submit" className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold">
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            const isUpload = item.to === "/upload";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition ${
                  active ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {isUpload ? (
                  <span className={`h-9 w-9 rounded-full flex items-center justify-center mb-0.5 ${
                    active ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className="h-5 w-5 mb-1" />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
