import LogRocket from "logrocket";

// Single source of truth for LogRocket. The previous setup initialised inline in
// router.tsx, which meant: no reconnect handling, no user identification, and no
// recovery when the SDK's session ended (idle timeout, backgrounded WebView, or a
// dropped network connection). That is what made recordings stop shortly after the
// session label/tick appeared in the dashboard.

const APP_ID = "p3epoj/vip-life-app";

// LogRocket ends a session after ~30 minutes of inactivity; long backgrounding in an
// Android WebView also tears the socket down. Anything longer than this away from the
// foreground gets a fresh session so recording continues in real time.
const RESUME_NEW_SESSION_AFTER_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

let initialized = false;
let hiddenAt: number | null = null;
let heartbeatId: number | undefined;
let identifiedUserId: string | null = null;

function startHeartbeat() {
  if (heartbeatId !== undefined) return;
  // A periodic event keeps the session marked active so the backend does not close
  // it while the user is reading/watching without interacting.
  heartbeatId = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    try {
      LogRocket.track("heartbeat");
    } catch {
      // Never let telemetry break the app.
    }
  }, HEARTBEAT_MS);
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    return;
  }

  const awayFor = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = null;
  if (awayFor < RESUME_NEW_SESSION_AFTER_MS) return;

  try {
    LogRocket.startNewSession();
    if (identifiedUserId) LogRocket.identify(identifiedUserId);
  } catch {
    // Ignore: recording resumes on the next navigation at worst.
  }
}

export function initLogRocket() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  LogRocket.init(APP_ID, {
    // Ship events almost immediately instead of the multi-second default batch.
    uploadTimeInterval: 1000,
    shouldDetectExceptions: true,
    network: { isEnabled: true },
    console: { isEnabled: true, shouldAggregateConsoleErrors: true },
    dom: { isEnabled: true },
  });

  startHeartbeat();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  // A dropped/restored connection is the other common reason the recording stops.
  window.addEventListener("online", () => {
    try {
      LogRocket.startNewSession();
      if (identifiedUserId) LogRocket.identify(identifiedUserId);
    } catch {
      // no-op
    }
  });
}

export function identifyLogRocketUser(
  userId: string | null,
  traits?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined" || !initialized) return;
  if (!userId) {
    identifiedUserId = null;
    return;
  }
  if (identifiedUserId === userId) return;
  identifiedUserId = userId;
  try {
    LogRocket.identify(userId, traits);
  } catch {
    // no-op
  }
}
