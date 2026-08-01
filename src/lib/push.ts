// Capacitor Push Notifications setup for native (Android) builds.
// On web this is a no-op; the existing browser Notification flow handles
// background messages there.

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;

export async function initNativePushNotifications(userId: string) {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  try {
    const { registerPlugin } = await import("@capacitor/core");
    // Firebase must be initialized natively (google-services.json present),
    // otherwise PushNotifications.register() throws IllegalStateException and
    // crashes the app.
    try {
      const PushSupport = registerPlugin<{ isAvailable(): Promise<{ available: boolean }> }>(
        "PushSupport",
      );
      const { available } = await PushSupport.isAvailable();
      if (!available) {
        initialized = false;
        return;
      }
    } catch {
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
