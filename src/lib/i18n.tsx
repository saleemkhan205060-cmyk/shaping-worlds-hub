import * as React from "react";
import { LEGACY_TRANSLATIONS } from "./locales/legacy";

export type LangCode =
  | "en" | "es" | "fr" | "pt" | "de" | "it"
  | "ar" | "ur" | "hi" | "bn" | "tr" | "ru"
  | "zh" | "ja" | "ko" | "id" | "sw";

export const LANGUAGES: { code: LangCode; name: string; native: string; rtl?: boolean }[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
];

type Dict = Record<string, string>;

// Only existing languages are active until the global translation release gate passes.
const TRANSLATIONS: Record<LangCode, Dict> = LEGACY_TRANSLATIONS;

const STORAGE_KEY = "viplife.lang";

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = React.createContext<Ctx | null>(null);

function detectInitial(): LangCode {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (saved && TRANSLATIONS[saved]) return saved;
  // Keep the initial language deterministic until the user chooses one.
  // Mobile Chrome commonly reports a non-English device locale; that used to
  // activate the signed-in DOM auto-translator over the entire 100-post feed
  // immediately after OAuth, causing a large synchronous walk and mutation
  // burst that looked like a frozen page. Explicit language choices are still
  // persisted and restored normally.
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<LangCode>("en");

  React.useEffect(() => {
    setLangState(detectInitial());
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    // Only update the lang attribute. Keep document direction LTR so the
    // app layout, icons, and navigation never flip when switching languages.
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
  }, [lang]);

  const setLang = React.useCallback((l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);

  const t = React.useCallback(
    (key: string) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [lang],
  );

  const dir = LANGUAGES.find((l) => l.code === lang)?.rtl ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Safe fallback for any code rendered outside the provider.
    return { lang: "en", setLang: () => {}, t: (k) => TRANSLATIONS.en[k] ?? k, dir: "ltr" };
  }
  return ctx;
}
