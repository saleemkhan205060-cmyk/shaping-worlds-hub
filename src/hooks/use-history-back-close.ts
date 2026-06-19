import { useCallback, useEffect, useRef } from "react";

/**
 * Pushes a history entry while an overlay is open so the mobile/browser
 * back button closes the overlay instead of leaving the app.
 *
 * IMPORTANT: `onClose` is captured via a ref so callers don't need to
 * memoize it. The effect only re-runs when `enabled` changes — otherwise
 * a new `onClose` identity on every parent render would tear down and
 * re-push the history entry repeatedly, which on some browsers fires a
 * spurious popstate and immediately closes the overlay (looking like a
 * freeze / the overlay never opening).
 */
export function useHistoryBackClose(onClose: () => void, enabled: boolean = true) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;

    history.pushState({ __lovableOverlay: true }, "");
    pushedRef.current = true;

    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        history.back();
      }
    };
  }, [enabled]);

  return useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
    }
    onCloseRef.current();
  }, []);
}
