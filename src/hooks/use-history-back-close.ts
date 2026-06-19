import { useEffect, useRef } from "react";

export function useHistoryBackClose(onClose: () => void, enabled: boolean = true) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    history.pushState({ __lovableOverlay: true }, "");
    pushedRef.current = true;

    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onClose();
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
  }, [enabled, onClose]);

  const handleManualClose = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
    }
    onClose();
  };

  return handleManualClose;
}
