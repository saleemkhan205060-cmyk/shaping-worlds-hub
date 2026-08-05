import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listenForNativeGoogleSession, restoreNativeGoogleSession } from "@/lib/google-auth";

/** Keeps the Android OAuth callback alive regardless of the current route. */
export function NativeGoogleAuthBridge() {
  const navigate = useNavigate();
  const completedRef = useRef(false);

  useEffect(() => {
    const finishSignIn = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      // App.getLaunchUrl() continues returning the OAuth callback for the
      // lifetime of the Android activity. A hard location.replace() remounted
      // this bridge, processed that same URL again, and created a reload loop.
      // Replace through TanStack Router so the activity and auth singleton stay
      // alive and the callback can only complete once per mounted app.
      void navigate({ to: "/", replace: true });
    };

    const stopListening = listenForNativeGoogleSession(
      finishSignIn,
      (error) => console.error("Google callback session restore failed:", error),
    );

    void restoreNativeGoogleSession()
      .then((restored) => {
        if (restored) finishSignIn();
      })
      .catch((error) => {
        console.error("Google callback session restore failed:", error);
      });

    return stopListening;
  }, [navigate]);

  return null;
}