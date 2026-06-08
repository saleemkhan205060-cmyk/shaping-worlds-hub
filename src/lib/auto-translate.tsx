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

export function AutoTranslate({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const translate = useServerFn(translateBatch);
  const langRef = React.useRef(lang);
  const authedRef = React.useRef(!!user);

  const cacheRef = React.useRef<Record<string, string>>({});
  const pendingRef = React.useRef<Set<Text>>(new Set());
  const inflightRef = React.useRef<Set<string>>(new Set());
  const scheduledRef = React.useRef(false);

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
      if (node.nodeValue !== next) node.nodeValue = next;
    } else {
      pendingRef.current.add(node);
    }
  }, []);

  const flush = React.useCallback(async () => {
    scheduledRef.current = false;
    const lng = langRef.current;
    if (lng === "en" || !authedRef.current) return;
    const nodes = Array.from(pendingRef.current);
    pendingRef.current.clear();

    const uniqueKeys = new Set<string>();
    for (const n of nodes) {
      const key = (originals.get(n) ?? n.nodeValue ?? "").trim();
      if (!key) continue;
      if (cacheRef.current[key]) continue;
      if (inflightRef.current.has(key)) continue;
      uniqueKeys.add(key);
    }
    const toTranslate = Array.from(uniqueKeys).slice(0, 80);
    if (!toTranslate.length) {
      // Re-apply for any nodes whose strings were already in flight/cache
      for (const n of nodes) applyNode(n, lng);
      return;
    }
    toTranslate.forEach((k) => inflightRef.current.add(k));
    try {
      const result = await translate({ data: { texts: toTranslate, target: lng } });
      const translations = result?.translations ?? toTranslate;
      toTranslate.forEach((k, i) => {
        cacheRef.current[k] = translations[i] ?? k;
      });
      saveCache(lng, cacheRef.current);
    } catch {
      // ignore; nodes stay as original
    } finally {
      toTranslate.forEach((k) => inflightRef.current.delete(k));
    }
    // Re-apply to all visible matching nodes (not only those queued)
    const all: Text[] = [];
    if (document.body) collectTextNodes(document.body, all);
    for (const n of all) applyNode(n, lng);
  }, [applyNode, translate]);

  const schedule = React.useCallback(() => {
    if (scheduledRef.current) return;
    scheduledRef.current = true;
    setTimeout(flush, 250);
  }, [flush]);

  const processAll = React.useCallback((lng: string) => {
    if (!document.body) return;
    const nodes: Text[] = [];
    collectTextNodes(document.body, nodes);
    for (const n of nodes) applyNode(n, lng);
    if (lng !== "en" && pendingRef.current.size) schedule();
  }, [applyNode, schedule]);

  // Handle lang changes: load cache, retranslate everything
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    langRef.current = lang;
    authedRef.current = !!user;
    cacheRef.current = loadCache(lang);
    processAll(lang);
  }, [lang, user, processAll]);


  // Observe DOM mutations to translate newly added text
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new MutationObserver((mutations) => {
      const lng = langRef.current;
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === 3) {
          const t = m.target as Text;
          // Update stored original if user/app legitimately changed text in English
          if (lng === "en") {
            originals.set(t, t.nodeValue ?? "");
          } else {
            // Only update original if value isn't the cached translation
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
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [applyNode, schedule]);

  return <>{children}</>;
}
