import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { translateBatch } from "@/lib/translate.functions";
import { useAuth } from "@/hooks/use-auth";


const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA",
  "SVG", "PATH", "CIRCLE", "RECT", "LINE", "POLYGON", "POLYLINE", "G",
  "CANVAS", "VIDEO", "AUDIO", "SOURCE",
]);

// Original text per Text node so we can restore / re-translate.
const originals = new WeakMap<Text, string>();

function shouldSkipNode(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p) {
    if (p.nodeType === 1) {
      const el = p as Element;
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.hasAttribute("data-no-translate")) return true;
      if (el.getAttribute("contenteditable") === "true") return true;
    }
    p = p.parentNode;
  }
  return false;
}

function collectTextNodes(root: Node, out: Text[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node as Text;
      const raw = originals.get(t) ?? t.nodeValue ?? "";
      const trimmed = raw.trim();
      if (!trimmed) return NodeFilter.FILTER_REJECT;
      // Skip pure numbers/symbols
      if (!/[A-Za-z\u00C0-\u024F\u0370-\u1CFF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(trimmed)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (shouldSkipNode(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
}

function cacheKey(lang: string) {
  return `viplife.tr.${lang}`;
}

function loadCache(lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: string, cache: Record<string, string>) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(cache));
  } catch {
    // ignore quota
  }
}

/**
 * Inside the Android (Capacitor) WebView the page origin is `https://localhost`,
 * so server-function requests never reach the hosted app. Every failed batch
 * used to leave its text nodes "pending", so each tap re-queued a full-document
 * walk plus a doomed network round-trip and the UI locked up. Auto-translation
 * is therefore skipped on native shells.
 */
function isNativeShell() {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

const MAX_CONSECUTIVE_FAILURES = 2;

export function AutoTranslate({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const translate = useServerFn(translateBatch);
  const langRef = React.useRef(lang);
  const authedRef = React.useRef(!!user);

  const cacheRef = React.useRef<Record<string, string>>({});
  const pendingRef = React.useRef<Set<Text>>(new Set());
  const inflightRef = React.useRef<Set<string>>(new Set());
  // Keys the translator could not resolve. They must never be retried in a
  // loop, otherwise every DOM mutation reschedules the same failing batch.
  const failedRef = React.useRef<Set<string>>(new Set());
  const failureCountRef = React.useRef(0);
  const disabledRef = React.useRef(false);
  const scheduledRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);
  const observerRef = React.useRef<MutationObserver | null>(null);
  // Guards against the observer reacting to our own text writes.
  const applyingRef = React.useRef(false);

  const translationOff = React.useCallback(
    () => disabledRef.current || !authedRef.current || langRef.current === "en",
    [],
  );

  // Apply translation to a single node based on current lang/cache.
  const applyNode = React.useCallback((node: Text, lng: string) => {
    const original = originals.get(node) ?? node.nodeValue ?? "";
    if (!originals.has(node)) originals.set(node, original);
    const key = original.trim();
    if (!key) return;
    if (lng === "en") {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }
    const translated = cacheRef.current[key];
    if (translated) {
      // Preserve leading/trailing whitespace
      const lead = original.match(/^\s*/)?.[0] ?? "";
      const trail = original.match(/\s*$/)?.[0] ?? "";
      const next = lead + translated + trail;
      if (node.nodeValue !== next) {
        applyingRef.current = true;
        node.nodeValue = next;
        applyingRef.current = false;
      }
    } else if (!failedRef.current.has(key) && !disabledRef.current) {
      pendingRef.current.add(node);
    }
  }, []);

  const applyAll = React.useCallback(
    (lng: string) => {
      if (!document.body) return;
      const nodes: Text[] = [];
      collectTextNodes(document.body, nodes);
      for (const n of nodes) applyNode(n, lng);
    },
    [applyNode],
  );

  const schedule = React.useCallback(() => {
    if (scheduledRef.current || disabledRef.current) return;
    scheduledRef.current = true;
    timerRef.current = window.setTimeout(() => void flushRef.current?.(), 400);
  }, []);

  const flush = React.useCallback(async () => {
    scheduledRef.current = false;
    const lng = langRef.current;
    if (translationOff()) {
      pendingRef.current.clear();
      return;
    }
    const nodes = Array.from(pendingRef.current);
    pendingRef.current.clear();

    const uniqueKeys = new Set<string>();
    for (const n of nodes) {
      const key = (originals.get(n) ?? n.nodeValue ?? "").trim();
      if (!key) continue;
      if (cacheRef.current[key]) continue;
      if (inflightRef.current.has(key)) continue;
      if (failedRef.current.has(key)) continue;
      uniqueKeys.add(key);
    }
    const toTranslate = Array.from(uniqueKeys).slice(0, 80);
    if (!toTranslate.length) {
      for (const n of nodes) applyNode(n, lng);
      return;
    }
    toTranslate.forEach((k) => inflightRef.current.add(k));
    let succeeded = false;
    try {
      const result = await translate({ data: { texts: toTranslate, target: lng } });
      const translations = result?.translations ?? toTranslate;
      toTranslate.forEach((k, i) => {
        cacheRef.current[k] = translations[i] ?? k;
      });
      saveCache(lng, cacheRef.current);
      succeeded = true;
      failureCountRef.current = 0;
    } catch {
      // Never retry these strings: a repeating failure would spin the UI.
      toTranslate.forEach((k) => failedRef.current.add(k));
      failureCountRef.current += 1;
      if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
        disabledRef.current = true;
        pendingRef.current.clear();
        observerRef.current?.disconnect();
      }
    } finally {
      toTranslate.forEach((k) => inflightRef.current.delete(k));
    }
    // Only walk the whole document when new translations actually arrived.
    if (succeeded) applyAll(lng);
  }, [applyAll, applyNode, translate, translationOff]);

  const flushRef = React.useRef<(() => Promise<void>) | null>(null);
  flushRef.current = flush;

  // Handle lang changes: load cache, retranslate everything
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    langRef.current = lang;
    authedRef.current = !!user;
    cacheRef.current = loadCache(lang);
    failedRef.current.clear();
    failureCountRef.current = 0;
    if (isNativeShell()) {
      disabledRef.current = true;
      return;
    }
    applyAll(lang);
    if (lang !== "en" && pendingRef.current.size) schedule();
  }, [lang, user, applyAll, schedule]);

  // Observe DOM mutations to translate newly added text
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNativeShell()) return;
    const observer = new MutationObserver((mutations) => {
      if (disabledRef.current || applyingRef.current) return;
      const lng = langRef.current;
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === 3) {
          const t = m.target as Text;
          if (lng === "en") {
            originals.set(t, t.nodeValue ?? "");
          } else {
            const prevOrig = originals.get(t);
            const currentTranslation = prevOrig
              ? cacheRef.current[prevOrig.trim()]
              : undefined;
            const trimmed = (t.nodeValue ?? "").trim();
            if (!currentTranslation || currentTranslation.trim() !== trimmed) {
              originals.set(t, t.nodeValue ?? "");
              applyNode(t, lng);
            }
          }
        } else {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 3) {
              applyNode(node as Text, lng);
            } else if (node.nodeType === 1) {
              const nodes: Text[] = [];
              collectTextNodes(node, nodes);
              for (const n of nodes) applyNode(n, lng);
            }
          });
        }
      }
      if (langRef.current !== "en" && pendingRef.current.size) schedule();
    });
    observerRef.current = observer;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      scheduledRef.current = false;
    };
  }, [applyNode, schedule]);

  return <>{children}</>;
}
