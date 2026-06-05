import * as React from "react";

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

// Keys cover navigation, menu, and common UI strings.
const TRANSLATIONS: Record<LangCode, Dict> = {
  en: {
    "nav.home": "Home", "nav.feed": "Feed", "nav.market": "Market", "nav.profile": "Profile",
    "menu.language": "Language", "menu.about": "About", "menu.signOut": "Sign Out",
    "common.signIn": "Sign in", "common.search": "Search", "common.cancel": "Cancel",
    "common.save": "Save", "common.post": "Post", "common.delete": "Delete", "common.edit": "Edit",
    "common.share": "Share", "common.follow": "Follow", "common.following": "Following",
    "common.message": "Message", "common.comment": "Comment", "common.like": "Like",
    "common.notifications": "Notifications", "common.messages": "Messages",
    "language.select": "Select language", "language.title": "Choose your language",
    "language.searchPlaceholder": "Search languages...",
  },
  es: {
    "nav.home": "Inicio", "nav.feed": "Muro", "nav.market": "Mercado", "nav.profile": "Perfil",
    "menu.language": "Idioma", "menu.about": "Acerca de", "menu.signOut": "Cerrar sesión",
    "common.signIn": "Iniciar sesión", "common.search": "Buscar", "common.cancel": "Cancelar",
    "common.save": "Guardar", "common.post": "Publicar", "common.delete": "Eliminar", "common.edit": "Editar",
    "common.share": "Compartir", "common.follow": "Seguir", "common.following": "Siguiendo",
    "common.message": "Mensaje", "common.comment": "Comentar", "common.like": "Me gusta",
    "common.notifications": "Notificaciones", "common.messages": "Mensajes",
    "language.select": "Seleccionar idioma", "language.title": "Elige tu idioma",
    "language.searchPlaceholder": "Buscar idiomas...",
  },
  fr: {
    "nav.home": "Accueil", "nav.feed": "Fil", "nav.market": "Marché", "nav.profile": "Profil",
    "menu.language": "Langue", "menu.about": "À propos", "menu.signOut": "Se déconnecter",
    "common.signIn": "Se connecter", "common.search": "Rechercher", "common.cancel": "Annuler",
    "common.save": "Enregistrer", "common.post": "Publier", "common.delete": "Supprimer", "common.edit": "Modifier",
    "common.share": "Partager", "common.follow": "Suivre", "common.following": "Suivi",
    "common.message": "Message", "common.comment": "Commenter", "common.like": "J'aime",
    "common.notifications": "Notifications", "common.messages": "Messages",
    "language.select": "Choisir la langue", "language.title": "Choisissez votre langue",
    "language.searchPlaceholder": "Rechercher des langues...",
  },
  pt: {
    "nav.home": "Início", "nav.feed": "Feed", "nav.market": "Mercado", "nav.profile": "Perfil",
    "menu.language": "Idioma", "menu.about": "Sobre", "menu.signOut": "Sair",
    "common.signIn": "Entrar", "common.search": "Buscar", "common.cancel": "Cancelar",
    "common.save": "Salvar", "common.post": "Publicar", "common.delete": "Excluir", "common.edit": "Editar",
    "common.share": "Compartilhar", "common.follow": "Seguir", "common.following": "Seguindo",
    "common.message": "Mensagem", "common.comment": "Comentar", "common.like": "Curtir",
    "common.notifications": "Notificações", "common.messages": "Mensagens",
    "language.select": "Selecionar idioma", "language.title": "Escolha o seu idioma",
    "language.searchPlaceholder": "Buscar idiomas...",
  },
  de: {
    "nav.home": "Start", "nav.feed": "Feed", "nav.market": "Markt", "nav.profile": "Profil",
    "menu.language": "Sprache", "menu.about": "Über", "menu.signOut": "Abmelden",
    "common.signIn": "Anmelden", "common.search": "Suchen", "common.cancel": "Abbrechen",
    "common.save": "Speichern", "common.post": "Posten", "common.delete": "Löschen", "common.edit": "Bearbeiten",
    "common.share": "Teilen", "common.follow": "Folgen", "common.following": "Gefolgt",
    "common.message": "Nachricht", "common.comment": "Kommentieren", "common.like": "Gefällt mir",
    "common.notifications": "Benachrichtigungen", "common.messages": "Nachrichten",
    "language.select": "Sprache wählen", "language.title": "Wähle deine Sprache",
    "language.searchPlaceholder": "Sprachen suchen...",
  },
  it: {
    "nav.home": "Home", "nav.feed": "Feed", "nav.market": "Mercato", "nav.profile": "Profilo",
    "menu.language": "Lingua", "menu.about": "Info", "menu.signOut": "Esci",
    "common.signIn": "Accedi", "common.search": "Cerca", "common.cancel": "Annulla",
    "common.save": "Salva", "common.post": "Pubblica", "common.delete": "Elimina", "common.edit": "Modifica",
    "common.share": "Condividi", "common.follow": "Segui", "common.following": "Seguiti",
    "common.message": "Messaggio", "common.comment": "Commenta", "common.like": "Mi piace",
    "common.notifications": "Notifiche", "common.messages": "Messaggi",
    "language.select": "Seleziona lingua", "language.title": "Scegli la tua lingua",
    "language.searchPlaceholder": "Cerca lingue...",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.feed": "الموجز", "nav.market": "السوق", "nav.profile": "الملف الشخصي",
    "menu.language": "اللغة", "menu.about": "حول", "menu.signOut": "تسجيل الخروج",
    "common.signIn": "تسجيل الدخول", "common.search": "بحث", "common.cancel": "إلغاء",
    "common.save": "حفظ", "common.post": "نشر", "common.delete": "حذف", "common.edit": "تعديل",
    "common.share": "مشاركة", "common.follow": "متابعة", "common.following": "تتابع",
    "common.message": "رسالة", "common.comment": "تعليق", "common.like": "إعجاب",
    "common.notifications": "الإشعارات", "common.messages": "الرسائل",
    "language.select": "اختر اللغة", "language.title": "اختر لغتك",
    "language.searchPlaceholder": "ابحث عن اللغات...",
  },
  ur: {
    "nav.home": "ہوم", "nav.feed": "فیڈ", "nav.market": "مارکیٹ", "nav.profile": "پروفائل",
    "menu.language": "زبان", "menu.about": "تعارف", "menu.signOut": "سائن آؤٹ",
    "common.signIn": "سائن ان", "common.search": "تلاش", "common.cancel": "منسوخ",
    "common.save": "محفوظ کریں", "common.post": "پوسٹ", "common.delete": "حذف", "common.edit": "ترمیم",
    "common.share": "شیئر", "common.follow": "فالو", "common.following": "فالونگ",
    "common.message": "پیغام", "common.comment": "تبصرہ", "common.like": "پسند",
    "common.notifications": "اطلاعات", "common.messages": "پیغامات",
    "language.select": "زبان منتخب کریں", "language.title": "اپنی زبان منتخب کریں",
    "language.searchPlaceholder": "زبانیں تلاش کریں...",
  },
  hi: {
    "nav.home": "होम", "nav.feed": "फ़ीड", "nav.market": "मार्केट", "nav.profile": "प्रोफ़ाइल",
    "menu.language": "भाषा", "menu.about": "परिचय", "menu.signOut": "साइन आउट",
    "common.signIn": "साइन इन", "common.search": "खोजें", "common.cancel": "रद्द करें",
    "common.save": "सहेजें", "common.post": "पोस्ट", "common.delete": "हटाएँ", "common.edit": "संपादित करें",
    "common.share": "शेयर", "common.follow": "फ़ॉलो", "common.following": "फ़ॉलोइंग",
    "common.message": "संदेश", "common.comment": "टिप्पणी", "common.like": "पसंद",
    "common.notifications": "सूचनाएँ", "common.messages": "संदेश",
    "language.select": "भाषा चुनें", "language.title": "अपनी भाषा चुनें",
    "language.searchPlaceholder": "भाषाएँ खोजें...",
  },
  bn: {
    "nav.home": "হোম", "nav.feed": "ফিড", "nav.market": "মার্কেট", "nav.profile": "প্রোফাইল",
    "menu.language": "ভাষা", "menu.about": "সম্পর্কে", "menu.signOut": "সাইন আউট",
    "common.signIn": "সাইন ইন", "common.search": "অনুসন্ধান", "common.cancel": "বাতিল",
    "common.save": "সংরক্ষণ", "common.post": "পোস্ট", "common.delete": "মুছুন", "common.edit": "সম্পাদনা",
    "common.share": "শেয়ার", "common.follow": "অনুসরণ", "common.following": "অনুসরণ করছেন",
    "common.message": "বার্তা", "common.comment": "মন্তব্য", "common.like": "পছন্দ",
    "common.notifications": "বিজ্ঞপ্তি", "common.messages": "বার্তা",
    "language.select": "ভাষা নির্বাচন", "language.title": "আপনার ভাষা চয়ন করুন",
    "language.searchPlaceholder": "ভাষা অনুসন্ধান...",
  },
  tr: {
    "nav.home": "Ana Sayfa", "nav.feed": "Akış", "nav.market": "Pazar", "nav.profile": "Profil",
    "menu.language": "Dil", "menu.about": "Hakkında", "menu.signOut": "Çıkış Yap",
    "common.signIn": "Giriş yap", "common.search": "Ara", "common.cancel": "İptal",
    "common.save": "Kaydet", "common.post": "Paylaş", "common.delete": "Sil", "common.edit": "Düzenle",
    "common.share": "Paylaş", "common.follow": "Takip et", "common.following": "Takip ediliyor",
    "common.message": "Mesaj", "common.comment": "Yorum", "common.like": "Beğen",
    "common.notifications": "Bildirimler", "common.messages": "Mesajlar",
    "language.select": "Dil seç", "language.title": "Dilinizi seçin",
    "language.searchPlaceholder": "Dilleri ara...",
  },
  ru: {
    "nav.home": "Главная", "nav.feed": "Лента", "nav.market": "Маркет", "nav.profile": "Профиль",
    "menu.language": "Язык", "menu.about": "О нас", "menu.signOut": "Выйти",
    "common.signIn": "Войти", "common.search": "Поиск", "common.cancel": "Отмена",
    "common.save": "Сохранить", "common.post": "Опубликовать", "common.delete": "Удалить", "common.edit": "Изменить",
    "common.share": "Поделиться", "common.follow": "Подписаться", "common.following": "Подписки",
    "common.message": "Сообщение", "common.comment": "Комментарий", "common.like": "Нравится",
    "common.notifications": "Уведомления", "common.messages": "Сообщения",
    "language.select": "Выбрать язык", "language.title": "Выберите язык",
    "language.searchPlaceholder": "Поиск языков...",
  },
  zh: {
    "nav.home": "首页", "nav.feed": "动态", "nav.market": "市场", "nav.profile": "个人",
    "menu.language": "语言", "menu.about": "关于", "menu.signOut": "退出登录",
    "common.signIn": "登录", "common.search": "搜索", "common.cancel": "取消",
    "common.save": "保存", "common.post": "发布", "common.delete": "删除", "common.edit": "编辑",
    "common.share": "分享", "common.follow": "关注", "common.following": "已关注",
    "common.message": "消息", "common.comment": "评论", "common.like": "赞",
    "common.notifications": "通知", "common.messages": "消息",
    "language.select": "选择语言", "language.title": "选择你的语言",
    "language.searchPlaceholder": "搜索语言...",
  },
  ja: {
    "nav.home": "ホーム", "nav.feed": "フィード", "nav.market": "マーケット", "nav.profile": "プロフィール",
    "menu.language": "言語", "menu.about": "概要", "menu.signOut": "ログアウト",
    "common.signIn": "ログイン", "common.search": "検索", "common.cancel": "キャンセル",
    "common.save": "保存", "common.post": "投稿", "common.delete": "削除", "common.edit": "編集",
    "common.share": "共有", "common.follow": "フォロー", "common.following": "フォロー中",
    "common.message": "メッセージ", "common.comment": "コメント", "common.like": "いいね",
    "common.notifications": "通知", "common.messages": "メッセージ",
    "language.select": "言語を選択", "language.title": "言語を選んでください",
    "language.searchPlaceholder": "言語を検索...",
  },
  ko: {
    "nav.home": "홈", "nav.feed": "피드", "nav.market": "마켓", "nav.profile": "프로필",
    "menu.language": "언어", "menu.about": "소개", "menu.signOut": "로그아웃",
    "common.signIn": "로그인", "common.search": "검색", "common.cancel": "취소",
    "common.save": "저장", "common.post": "게시", "common.delete": "삭제", "common.edit": "편집",
    "common.share": "공유", "common.follow": "팔로우", "common.following": "팔로잉",
    "common.message": "메시지", "common.comment": "댓글", "common.like": "좋아요",
    "common.notifications": "알림", "common.messages": "메시지",
    "language.select": "언어 선택", "language.title": "언어를 선택하세요",
    "language.searchPlaceholder": "언어 검색...",
  },
  id: {
    "nav.home": "Beranda", "nav.feed": "Umpan", "nav.market": "Pasar", "nav.profile": "Profil",
    "menu.language": "Bahasa", "menu.about": "Tentang", "menu.signOut": "Keluar",
    "common.signIn": "Masuk", "common.search": "Cari", "common.cancel": "Batal",
    "common.save": "Simpan", "common.post": "Posting", "common.delete": "Hapus", "common.edit": "Edit",
    "common.share": "Bagikan", "common.follow": "Ikuti", "common.following": "Mengikuti",
    "common.message": "Pesan", "common.comment": "Komentar", "common.like": "Suka",
    "common.notifications": "Notifikasi", "common.messages": "Pesan",
    "language.select": "Pilih bahasa", "language.title": "Pilih bahasa Anda",
    "language.searchPlaceholder": "Cari bahasa...",
  },
  sw: {
    "nav.home": "Nyumbani", "nav.feed": "Mlisho", "nav.market": "Soko", "nav.profile": "Wasifu",
    "menu.language": "Lugha", "menu.about": "Kuhusu", "menu.signOut": "Toka",
    "common.signIn": "Ingia", "common.search": "Tafuta", "common.cancel": "Ghairi",
    "common.save": "Hifadhi", "common.post": "Chapisha", "common.delete": "Futa", "common.edit": "Hariri",
    "common.share": "Shiriki", "common.follow": "Fuata", "common.following": "Unafuata",
    "common.message": "Ujumbe", "common.comment": "Toa maoni", "common.like": "Penda",
    "common.notifications": "Arifa", "common.messages": "Ujumbe",
    "language.select": "Chagua lugha", "language.title": "Chagua lugha yako",
    "language.searchPlaceholder": "Tafuta lugha...",
  },
};

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
  const nav = navigator.language?.slice(0, 2).toLowerCase() as LangCode;
  return TRANSLATIONS[nav] ? nav : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<LangCode>("en");

  React.useEffect(() => {
    setLangState(detectInitial());
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
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
