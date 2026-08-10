import { supabase } from "@/integrations/supabase/client";
import { publishAuthenticatedSession } from "@/hooks/use-auth";

// Same Web OAuth client used for the native ID-token flow. Google Identity
// Services renders its account chooser as an overlay on the CURRENT page, so
// the user never leaves the sign-in screen.
const GOOGLE_WEB_CLIENT_ID =
  "393519087227-386njhjn53uprbj4evc7q758bhv5g6si.apps.googleusercontent.com";
const GSI_SRC = "https://accounts.google.com/gsi/client";

type GsiCredentialResponse = { credential?: string };
type Gsi = {
  accounts: {
    id: {
      initialize(config: Record<string, unknown>): void;
      prompt(listener?: (notification: GsiNotification) => void): void;
      cancel(): void;
    };
  };
};
type GsiNotification = {
  isDisplayed?: () => boolean;
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

let scriptPromise: Promise<Gsi | null> | null = null;

function loadGsi(): Promise<Gsi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const existing = (window as unknown as { google?: Gsi }).google;
  if (existing?.accounts?.id) return Promise.resolve(existing);

  scriptPromise ??= new Promise<Gsi | null>((resolve) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as unknown as { google?: Gsi }).google ?? null);
    script.onerror = () => {
      scriptPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Opens Google's in-page account chooser. Resolves `{ signedIn: true }` once the
 * chosen account's ID token has been exchanged for an app session, or
 * `{ signedIn: false, shown: false }` when the overlay could not be displayed
 * (caller should then fall back to the normal OAuth flow).
 */
export async function openGoogleAccountChooser(): Promise<{
  signedIn: boolean;
  shown: boolean;
}> {
  const google = await loadGsi();
  if (!google?.accounts?.id) return { signedIn: false, shown: false };

  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);

  return await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: { signedIn: boolean; shown: boolean }) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      nonce: hashedNonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      itp_support: true,
      callback: (response: GsiCredentialResponse) => {
        if (!response.credential) {
          finish({ signedIn: false, shown: true });
          return;
        }
        void supabase.auth
          .signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          })
          .then(({ data, error }) => {
            if (error) throw error;
            if (!data.session) throw new Error("Google sign-in did not create a session");
            publishAuthenticatedSession(data.session);
            finish({ signedIn: true, shown: true });
          })
          .catch((error) => {
            if (settled) return;
            settled = true;
            reject(error);
          });
      },
    });

    google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        finish({ signedIn: false, shown: false });
      }
    });
  });
}
