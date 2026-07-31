import { useEffect } from "react";
import { listenForNativeGoogleSession, restoreNativeGoogleSession } from "@/lib/google-auth";

/** Keeps the Android OAuth callback alive regardless of the current route. */
export function NativeGoogleAuthBridge() {
  useEffect(() => {
    const stopListening = listenForNativeGoogleSession(
      () => undefined,
      (error) => console.error("Google callback session restore failed:", error),
    );

    void restoreNativeGoogleSession().catch((error) => {
      console.error("Google callback session restore failed:", error);
    });

    return stopListening;
  }, []);

  return null;
}