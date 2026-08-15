// Capacitor Push Notifications setup for native (Android) builds.
// On web this is a no-op; the existing browser Notification flow handles
// background messages there.

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { hasNativePlugin } from "./native-plugins";

let initialized = false;

// Native bridge calls can hang if the plugin never answers. Never let push
// setup keep a promise (or the UI) waiting forever.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function initNativePushNotifications(userId: string) {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  try {

    const { registerPlugin } = await import("@capacitor/core");
    // Firebase must be initialized natively (google-services.json present) AND
    // FirebaseMessaging must resolve, otherwise PushNotifications.register()
    // throws IllegalStateException inside FirebaseApp.getInstance() and the
    // whole app crashes. Never call register() without this gate.
    const PushSupport = registerPlugin<{ isAvailable(): Promise<{ available: boolean }> }>(
      "PushSupport",
    );
    const isFirebaseReady = async () => {
      try {
        const { available } = await withTimeout(PushSupport.isAvailable(), 4_000, {
          available: false,
        });
        return available === true;
      } catch {
        return false;
      }
    };

    if (!hasNativePlugin("PushNotifications") || !(await isFirebaseReady())) {
      initialized = false;
      return;
    }


    const { PushNotifications } = await import("@capacitor/push-notifications");




    // Ensure a "messages" channel exists with our custom sound (Android 8+)
    try {
      await PushNotifications.createChannel({
        id: "messages",
        name: "Messages",
        description: "New chat messages",
        importance: 5, // IMPORTANCE_HIGH -> heads-up + sound
        visibility: 1,
        sound: "notification", // res/raw/notification.mp3
        lights: true,
        vibration: true,
      });
    } catch {
      /* channel APIs are best-effort */
    }

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    PushNotifications.removeAllListeners().catch(() => {});

    PushNotifications.addListener("registration", async (token) => {
      try {
        await supabase
          .from("push_tokens")
          .upsert(
            { user_id: userId, token: token.value, platform: "android" },
            { onConflict: "token" },
          );
      } catch {
        /* ignore */
      }
    });

    PushNotifications.addListener("registrationError", () => {
      /* surfaced to user via OS UI; nothing actionable here */
    });

    // Re-verify after the permission prompt: register() is a native call that
    // cannot be caught from JS if Firebase is missing.
    if (!(await isFirebaseReady())) {
      initialized = false;
      return;
    }

    await PushNotifications.register();
  } catch {
    initialized = false;
  }
}

export async function unregisterNativePush() {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
  } catch {
    /* ignore */
  }
}
