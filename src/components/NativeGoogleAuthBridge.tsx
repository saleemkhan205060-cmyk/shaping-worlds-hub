import { useEffect } from "react";
import { listenForNativeGoogleSession, restoreNativeGoogleSession } from "@/lib/google-auth";

/** Keeps the Android OAuth callback alive regardless of the current route. */
export function NativeGoogleAuthBridge() {
  useEffect(() => {
    const finishSignIn = () => {
      // The OAuth browser returns to the existing Android activity, so the
      // pending click handler on /auth never resumes. Leave that stale page
      // after the callback has restored and verified the persisted session.
      window.location.replace("/");
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
  }, []);

  return null;
}