import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, createContext, useContext } from "react";
import { Home, User, Bell, LogOut, LogIn, Menu, Languages, Check, Loader2, Search, Plus, MessageSquare, Settings } from "lucide-react";
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
interface FullscreenContextType {
  mediaFullscreen: boolean;
  setMediaFullscreen: (value: boolean) => void;
}

export const FullscreenContext = createContext<FullscreenContextType>({
  mediaFullscreen: false,
  setMediaFullscreen: () => {},
});

const FeedIcon = ({ className }: { className?: string }) => (
  <img src={feedIconUrl} alt="Feed" className={`${className ?? ""} object-contain`} />
);
const COUNTRY_LANGUAGES: {
  country: string;
  lang: LangCode;
  iso: string;
}[] = [
    { country: "Afghanistan", lang: "ur", iso: "AF" },
  { country: "Albania", lang: "en", iso: "AL" },
  { country: "Algeria", lang: "ar", iso: "DZ" },
  { country: "Andorra", lang: "es", iso: "AD" },
  { country: "Angola", lang: "pt", iso: "AO" },
  { country: "Antigua and Barbuda", lang: "en", iso: "AG" },
  { country: "Argentina", lang: "es", iso: "AR" },
  { country: "Armenia", lang: "ru", iso: "AM" },
  { country: "Australia", lang: "en", iso: "AU" },
  { country: "Austria", lang: "de", iso: "AT" },
  { country: "Azerbaijan", lang: "tr", iso: "AZ" },
  { country: "Bahamas", lang: "en", iso: "BS" },
  { country: "Bahrain", lang: "ar", iso: "BH" },
  { country: "Bangladesh", lang: "bn", iso: "BD" },
  { country: "Barbados", lang: "en", iso: "BB" },
  { country: "Belarus", lang: "ru", iso: "BY" },
  { country: "Belgium", lang: "fr", iso: "BE" },
  { country: "Belize", lang: "en", iso: "BZ" },
  { country: "Benin", lang: "fr", iso: "BJ" },
  { country: "Bhutan", lang: "hi", iso: "BT" },
  { country: "Bolivia", lang: "es", iso: "BO" },
  { country: "Bosnia and Herzegovina", lang: "ru", iso: "BA" },
  { country: "Botswana", lang: "en", iso: "BW" },
  { country: "Brazil", lang: "pt", iso: "BR" },
  { country: "Brunei", lang: "id", iso: "BN" },
  { country: "Bulgaria", lang: "ru", iso: "BG" },
  { country: "Burkina Faso", lang: "fr", iso: "BF" },
  { country: "Burundi", lang: "fr", iso: "BI" },
  { country: "Cabo Verde", lang: "pt", iso: "CV" },
  { country: "Cambodia", lang: "en", iso: "KH" },
  { country: "Cameroon", lang: "fr", iso: "CM" },
  { country: "Canada", lang: "en", iso: "CA" },
  { country: "Central African Republic", lang: "fr", iso: "CF" },
  { country: "Chad", lang: "fr", iso: "TD" },
  { country: "Chile", lang: "es", iso: "CL" },
  { country: "China", lang: "zh", iso: "CN" },
  { country: "Colombia", lang: "es", iso: "CO" },
  { country: "Comoros", lang: "ar", iso: "KM" },
  { country: "Congo", lang: "fr", iso: "CG" },
  { country: "Costa Rica", lang: "es", iso: "CR" },
  { country: "Côte d’Ivoire", lang: "fr", iso: "CI" },
  { country: "Croatia", lang: "ru", iso: "HR" },
  { country: "Cuba", lang: "es", iso: "CU" },
  { country: "Cyprus", lang: "en", iso: "CY" },
  { country: "Czechia", lang: "en", iso: "CZ" },
  { country: "Democratic Republic of the Congo", lang: "fr", iso: "CD" },
  { country: "Denmark", lang: "en", iso: "DK" },
  { country: "Djibouti", lang: "ar", iso: "DJ" },
  { country: "Dominica", lang: "en", iso: "DM" },
  { country: "Dominican Republic", lang: "es", iso: "DO" },
  { country: "Ecuador", lang: "es", iso: "EC" },
  { country: "Egypt", lang: "ar", iso: "EG" },
  { country: "El Salvador", lang: "es", iso: "SV" },
  { country: "Equatorial Guinea", lang: "es", iso: "GQ" },
  { country: "Eritrea", lang: "ar", iso: "ER" },
  { country: "Estonia", lang: "en", iso: "EE" },
  { country: "Eswatini", lang: "en", iso: "SZ" },
  { country: "Ethiopia", lang: "en", iso: "ET" },
  { country: "Fiji", lang: "en", iso: "FJ" },
  { country: "Finland", lang: "en", iso: "FI" },
  { country: "France", lang: "fr", iso: "FR" },
  { country: "Gabon", lang: "fr", iso: "GA" },
  { country: "Gambia", lang: "en", iso: "GM" },
  { country: "Georgia", lang: "ru", iso: "GE" },
  { country: "Germany", lang: "de", iso: "DE" },
  { country: "Ghana", lang: "en", iso: "GH" },
  { country: "Greece", lang: "en", iso: "GR" },
  { country: "Grenada", lang: "en", iso: "GD" },
  { country: "Guatemala", lang: "es", iso: "GT" },
  { country: "Guinea", lang: "fr", iso: "GN" },
  { country: "Guinea-Bissau", lang: "pt", iso: "GW" },
  { country: "Guyana", lang: "en", iso: "GY" },
  { country: "Haiti", lang: "fr", iso: "HT" },
  { country: "Honduras", lang: "es", iso: "HN" },
  { country: "Hungary", lang: "en", iso: "HU" },
  { country: "Iceland", lang: "en", iso: "IS" },
  { country: "India", lang: "hi", iso: "IN" },
  { country: "Indonesia", lang: "id", iso: "ID" },
  { country: "Iran", lang: "ur", iso: "IR" },
  { country: "Iraq", lang: "ar", iso: "IQ" },
  { country: "Ireland", lang: "en", iso: "IE" },
  { country: "Israel", lang: "ar", iso: "IL" },
  { country: "Italy", lang: "it", iso: "IT" },
  { country: "Jamaica", lang: "en", iso: "JM" },
  { country: "Japan", lang: "ja", iso: "JP" },
  { country: "Jordan", lang: "ar", iso: "JO" },
  { country: "Kazakhstan", lang: "ru", iso: "KZ" },
  { country: "Kenya", lang: "sw", iso: "KE" },
  { country: "Kiribati", lang: "en", iso: "KI" },
  { country: "Kuwait", lang: "ar", iso: "KW" },
  { country: "Kyrgyzstan", lang: "ru", iso: "KG" },
  { country: "Laos", lang: "en", iso: "LA" },
  { country: "Latvia", lang: "en", iso: "LV" },
  { country: "Lebanon", lang: "ar", iso: "LB" },
  { country: "Lesotho", lang: "en", iso: "LS" },
  { country: "Liberia", lang: "en", iso: "LR" },
  { country: "Libya", lang: "ar", iso: "LY" },
  { country: "Liechtenstein", lang: "de", iso: "LI" },
  { country: "Lithuania", lang: "en", iso: "LT" },
  { country: "Luxembourg", lang: "fr", iso: "LU" },
  { country: "Madagascar", lang: "fr", iso: "MG" },
  { country: "Malawi", lang: "en", iso: "MW" },
  { country: "Malaysia", lang: "id", iso: "MY" },
  { country: "Maldives", lang: "en", iso: "MV" },
  { country: "Mali", lang: "fr", iso: "ML" },
  { country: "Malta", lang: "en", iso: "MT" },
  { country: "Marshall Islands", lang: "en", iso: "MH" },
  { country: "Mauritania", lang: "ar", iso: "MR" },
  { country: "Mauritius", lang: "fr", iso: "MU" },
  { country: "Mexico", lang: "es", iso: "MX" },
  { country: "Micronesia", lang: "en", iso: "FM" },
  { country: "Moldova", lang: "ru", iso: "MD" },
  { country: "Monaco", lang: "fr", iso: "MC" },
  { country: "Mongolia", lang: "en", iso: "MN" },
  { country: "Montenegro", lang: "ru", iso: "ME" },
  { country: "Morocco", lang: "ar", iso: "MA" },
  { country: "Mozambique", lang: "pt", iso: "MZ" },
  { country: "Myanmar", lang: "en", iso: "MM" },
  { country: "Namibia", lang: "en", iso: "NA" },
  { country: "Nauru", lang: "en", iso: "NR" },
  { country: "Nepal", lang: "hi", iso: "NP" },
  { country: "Netherlands", lang: "en", iso: "NL" },
  { country: "New Zealand", lang: "en", iso: "NZ" },
  { country: "Nicaragua", lang: "es", iso: "NI" },
  { country: "Niger", lang: "fr", iso: "NE" },
  { country: "Nigeria", lang: "en", iso: "NG" },
  { country: "North Korea", lang: "ko", iso: "KP" },
  { country: "North Macedonia", lang: "en", iso: "MK" },
  { country: "Norway", lang: "en", iso: "NO" },
  { country: "Oman", lang: "ar", iso: "OM" },
  { country: "Pakistan", lang: "ur", iso: "PK" },
  { country: "Palau", lang: "en", iso: "PW" },
  { country: "Palestine", lang: "ar", iso: "PS" },
  { country: "Panama", lang: "es", iso: "PA" },
  { country: "Papua New Guinea", lang: "en", iso: "PG" },
  { country: "Paraguay", lang: "es", iso: "PY" },
  { country: "Peru", lang: "es", iso: "PE" },
  { country: "Philippines", lang: "en", iso: "PH" },
  { country: "Poland", lang: "en", iso: "PL" },
  { country: "Portugal", lang: "pt", iso: "PT" },
  { country: "Qatar", lang: "ar", iso: "QA" },
  { country: "Romania", lang: "en", iso: "RO" },
  { country: "Russia", lang: "ru", iso: "RU" },
  { country: "Rwanda", lang: "fr", iso: "RW" },
  { country: "Saint Kitts and Nevis", lang: "en", iso: "KN" },
  { country: "Saint Lucia", lang: "en", iso: "LC" },
  { country: "Saint Vincent and the Grenadines", lang: "en", iso: "VC" },
  { country: "Samoa", lang: "en", iso: "WS" },
  { country: "San Marino", lang: "it", iso: "SM" },
  { country: "Sao Tome and Principe", lang: "pt", iso: "ST" },
  { country: "Saudi Arabia", lang: "ar", iso: "SA" },
  { country: "Senegal", lang: "fr", iso: "SN" },
  { country: "Serbia", lang: "ru", iso: "RS" },
  { country: "Seychelles", lang: "fr", iso: "SC" },
  { country: "Sierra Leone", lang: "en", iso: "SL" },
  { country: "Singapore", lang: "en", iso: "SG" },
  { country: "Slovakia", lang: "en", iso: "SK" },
  { country: "Slovenia", lang: "en", iso: "SI" },
  { country: "Solomon Islands", lang: "en", iso: "SB" },
  { country: "Somalia", lang: "ar", iso: "SO" },
  { country: "South Africa", lang: "en", iso: "ZA" },
  { country: "South Korea", lang: "ko", iso: "KR" },
  { country: "South Sudan", lang: "en", iso: "SS" },
  { country: "Spain", lang: "es", iso: "ES" },
  { country: "Sri Lanka", lang: "hi", iso: "LK" },
  { country: "Sudan", lang: "ar", iso: "SD" },
  { country: "Suriname", lang: "en", iso: "SR" },
  { country: "Sweden", lang: "en", iso: "SE" },
  { country: "Switzerland", lang: "de", iso: "CH" },
  { country: "Syria", lang: "ar", iso: "SY" },
  { country: "Tajikistan", lang: "ru", iso: "TJ" },
  { country: "Tanzania", lang: "sw", iso: "TZ" },
  { country: "Thailand", lang: "en", iso: "TH" },
  { country: "Timor-Leste", lang: "id", iso: "TL" },
  { country: "Togo", lang: "fr", iso: "TG" },
  { country: "Tonga", lang: "en", iso: "TO" },
  { country: "Trinidad and Tobago", lang: "en", iso: "TT" },
  { country: "Tunisia", lang: "ar", iso: "TN" },
  { country: "Türkiye", lang: "tr", iso: "TR" },
  { country: "Turkmenistan", lang: "ru", iso: "TM" },
  { country: "Tuvalu", lang: "en", iso: "TV" },
  { country: "Uganda", lang: "en", iso: "UG" },
  { country: "Ukraine", lang: "ru", iso: "UA" },
  { country: "United Arab Emirates", lang: "ar", iso: "AE" },
  { country: "United Kingdom", lang: "en", iso: "GB" },
  { country: "United States", lang: "en", iso: "US" },
  { country: "Uruguay", lang: "es", iso: "UY" },
  { country: "Uzbekistan", lang: "ru", iso: "UZ" },
  { country: "Vanuatu", lang: "en", iso: "VU" },
  { country: "Vatican City", lang: "it", iso: "VA" },
  { country: "Venezuela", lang: "es", iso: "VE" },
  { country: "Vietnam", lang: "en", iso: "VN" },
  { country: "Yemen", lang: "ar", iso: "YE" },
  { country: "Zambia", lang: "en", iso: "ZM" },
  { country: "Zimbabwe", lang: "en", iso: "ZW" },
];
function countryFlag(iso: string): string {
  return String.fromCodePoint(
    ...Array.from(iso.toUpperCase(), (letter) =>
      127397 + letter.charCodeAt(0)
    ),
  );
}
const navItems = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/u/$id", labelKey: "nav.profile", icon: User },] as const;

const NOTIF_SEEN_KEY = "viplife.notifSeenAt";
const NOTIFICATION_POST_LIMIT = 200;

export function Layout({
  children,
  hideMobileNav = false,
  fullScreenMobile = false,
  viewportBoundMobile = false,
}: {
  children: React.ReactNode;
  hideMobileNav?: boolean;
  fullScreenMobile?: boolean;
  viewportBoundMobile?: boolean;
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
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const sortedCountries = useMemo(
    () => [...COUNTRY_LANGUAGES].sort((a, b) => a.country.localeCompare(b.country)),
    [],
  );
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
  const [mediaFullscreen, setMediaFullscreen] = useState(false);


  return (
    <SearchContext.Provider value={{ query: searchQuery, setQuery: setSearchQuery }}>
    <FullscreenContext.Provider value={{ mediaFullscreen, setMediaFullscreen }}>

     <div className={`${fullScreenMobile ? "h-[100dvh] overflow-hidden" : viewportBoundMobile ? "h-[100dvh] flex flex-col overflow-hidden md:h-auto md:min-h-screen md:overflow-visible" : "min-h-screen"} bg-[#003D25] text-slate-900 ${hideMobileNav || viewportBoundMobile ? "" : "pb-24 md:pb-0"}`}>
      <header className={`sticky top-0 z-30 bg-[#003D25] backdrop-blur border-b border-slate-200 ${mediaFullscreen ? "hidden" : fullScreenMobile ? "hidden md:block" : ""}`}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-[68px] flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-12 w-12 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-2 border-white flex items-center justify-center">
           <img
           src={logoUrl}
          alt="VIP Life logo"
         className="h-13 w-13 object-contain"
        />
       </div>
          </div>
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
              className="group flex items-center gap-2 h-9 w-full max-w-md px-4 rounded-full bg-[#004A2D] hover:bg-[#005A35] border border-[#19D66B] transition shadow-sm"
              aria-label="Search"
            >    
              <span className="flex items-center justify-center shrink-0 text-white">
               <Search className="h-5 w-5" strokeWidth={2.5} />
                </span>
              <span className="text-sm font-medium text-slate-500 truncate">
                Search VIP Life…
              </span>
            </button>
          </div>


          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {navItems.map((item) => {
            const active = item.to === "/u/$id"
             ? path.startsWith("/u/")
             : path === item.to;
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
              className="relative h-10 w-10 rounded-full hover:bg-[#005A35] flex items-center justify-center text-white"
              aria-label="Notifications"
            >
              <Bell className="h-7 w-7" />
              <Badge n={unreadNotifs} />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menu"
                  className="relative h-10 w-10 rounded-full hover:bg-[#005A35] flex items-center justify-center text-white"
                >
                  <Menu className="h-7 w-7" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate({ to: "/account-settings" })}>
                <Settings className="h-4 w-4 mr-2" /> Account Settings
                 </DropdownMenuItem>
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
        <DialogContent className="w-[calc(100%-24px)] max-w-md rounded-2xl border border-[#19D66B]/40 bg-white p-0 shadow-2xl overflow-hidden gap-0">
          <div className="border-b border-[#19D66B]/20 bg-[#003D25] px-5 py-4">
          <DialogTitle className="text-lg font-bold text-white">
         Choose Your Country
       </DialogTitle>
     <p className="mt-1 text-sm text-white/70">
       Select your country to set your language
        </p>
         </div>
          <Command className="bg-white">
            <CommandInput
             placeholder="Search countries..."
             className="h-12 text-sm placeholder:text-slate-400"
              />
             <CommandList className="max-h-[65vh] min-h-[200px] overflow-y-auto p-2">
              <CommandEmpty>—</CommandEmpty>
             {sortedCountries.map((c) => (
            <CommandItem
           key={c.country}
         value={c.country}
       onSelect={() => {
      setLang(c.lang);
      setSelectedCountry(c.country);
      setLangOpen(false);
    }}
    className="flex items-center justify-between rounded-xl px-3 py-3 text-sm cursor-pointer aria-selected:bg-[#003D25]/10 aria-selected:text-[#003D25]"
     >
      <span className="flex items-center gap-3">
     <img
     src={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`}
    alt={`${c.country} flag`}
    className="h-5 w-7 rounded-sm object-cover"
    />
    <span className="font-medium">
      {c.country}
       </span>
       </span>

        {selectedCountry === c.country && (
         <Check className="h-5 w-5 text-[#19D66B]" />
          )}
           </CommandItem>
            ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

    <main
     className={
      fullScreenMobile
      ? "fixed inset-0 z-40 overflow-hidden bg-[#003D25] md:static md:z-auto md:h-auto md:overflow-visible md:max-w-6xl md:mx-auto md:px-4 md:py-6"
      : viewportBoundMobile
      ? "flex-1 min-h-0 overflow-hidden w-full max-w-6xl mx-auto px-3 sm:px-4 py-0 md:flex-none md:overflow-visible md:py-6"
      : path.startsWith("/u/")
     ? "max-w-6xl mx-auto px-1 sm:px-2 py-0 md:py-6"
     : "max-w-6xl mx-auto px-3 sm:px-4 py-0 md:py-6"
     }
    >
  {children}
</main>

{!hideMobileNav && (
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#003D25] backdrop-blur border-t border-[#19D66B]"
        
        style={{ paddingBottom: "max(0px, calc(env(safe-area-inset-bottom) - 8px))" }}
      >
        <div className="relative grid grid-cols-4 items-end">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = item.to === "/u/$id"
            ? path.startsWith("/u/")
            : path === item.to;
            const isHome = item.to === "/";
            const showSpinner = isHome && homeReloading;
            // Insert the + button visually in the middle column by ordering
            const colClass = idx === 0 ? "col-start-1" : "col-start-4";
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
                  active ? "text-[#19D66B]" : "text-white hover:text-[#19D66B]"
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
            className="col-start-2 row-start-1 flex flex-col items-center justify-end py-2 text-xs font-medium text-white hover:text-[#19D66B]"
          >
            <span className="h-8 w-8 flex items-center justify-center mb-1">
              <span className="h-8 w-8 rounded-full bg-[#057543] shadow-md shadow-indigo-500/30 ring-2 ring-white flex items-center justify-center transition-transform active:scale-95">
                <Plus className="h-4 w-4 text-white" strokeWidth={3} />
              </span>
            </span>
            Upload
          </Link>
          {/* Inbox button */}
          <Link
            to={user ? "/messages" : "/auth"}
            search={{ to: undefined }}
            aria-label="Inbox"
            className="col-start-3 row-start-1 flex flex-col items-center justify-end py-2 text-xs font-medium text-white hover:text-[#19D66B]"
          >
            <span className="relative h-8 w-8 flex items-center justify-center mb-1">
              <MessageSquare className="h-7 w-7" strokeWidth={2} />
              {user && <Badge n={unreadMsgs} />}
            </span>
            Inbox
          </Link>
        </div>
      </nav>
    )}
    </div>
    </FullscreenContext.Provider>
    </SearchContext.Provider>
  );
}
