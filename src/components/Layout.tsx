import { Link, useRouterState } from "@tanstack/react-router";
import { Home, User, Video, Bell, Search } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              S
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-sm tracking-tight">
                SHAPING
              </div>
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
                    active
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
              <Search className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200">
        <div className="grid grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-3 text-xs font-medium ${
                  active ? "text-indigo-600" : "text-slate-500"
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
