import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  confirmAuthenticatedUser,
  publishAuthenticatedSession,
  useAuth,
} from "@/hooks/use-auth";
import {
  describeGoogleAuthError,
  signInWithGoogle,
} from "@/lib/google-auth";
import { toast } from "sonner";
import { Globe, Loader2, ChevronDown } from "lucide-react";
import { getOAuthRedirectOrigin } from "@/lib/oauth-origin";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const authErrorMessage = (error: unknown, action: "signin" | "signup" | "google") => {
    const authError = error as { code?: string; message?: string; status?: number };
    const message = String(authError?.message ?? "");
    const code = String(authError?.code ?? "");

    if (code === "weak_password" || /weak|easy to guess|pwned/i.test(message)) {
      return "Please choose a stronger, unique password that you have not used before.";
    }
    if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
      return "Please confirm your email, then sign in.";
    }
    if (code === "user_already_exists" || /already registered|already exists/i.test(message)) {
      return "An account with this email already exists. Please sign in.";
    }
    if (authError?.status === 429 || /rate limit|too many requests/i.test(message)) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (/timed out/i.test(message)) {
      return "Authentication timed out. Check your connection and try again.";
    }
    if (action === "signin") return "Invalid email or password";
    if (action === "google") {
      const detail = describeGoogleAuthError(error);
      return detail ? `Google sign-in failed: ${detail}` : "Google sign-in failed. Please try again.";
    }
    return "Couldn't create your account. Please try again.";
  };

  const waitForGoogleSession = async () => {
    if (await confirmAuthenticatedUser()) return true;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = async (authenticated: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        subscription.unsubscribe();
        if (!authenticated) {
          resolve(false);
          return;
        }
        try {
          resolve(Boolean(await confirmAuthenticatedUser()));
        } catch {
          resolve(false);
        }
      };
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) void finish(true);
      });
      const timeoutId = window.setTimeout(() => void finish(false), 15_000);
    });
  };

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/" });
  }, [user, authLoading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${getOAuthRedirectOrigin()}/`,
              data: { display_name: displayName || email.split("@")[0] },
            },
          });
        if (error) throw error;
        if (data.session) {
          // signUp has already created and returned a server-issued session.
          // The shared auth listener persists it; a second getUser request here
          // can time out in Android WebView and incorrectly report failure.
          publishAuthenticatedSession(data.session);
          toast.success("Account created!");
          navigate({ to: "/" });
        } else {
          toast.success("Account created! Check your email to confirm.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) {
          throw new Error("Sign-in completed without a valid session");
        }
        // The successful password response is the session source of truth and
        // onAuthStateChange publishes it to the rest of the app.
        publishAuthenticatedSession(data.session);
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      toast.error(authErrorMessage(err, mode));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (chooseAccount = false) => {
    if (mode === "signup" && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithGoogle({
          extraParams: chooseAccount ? { prompt: "select_account" } : undefined,
        });
      if (result.error) {
        const msg = String(result.error?.message ?? "");
        const cancelled = /cancel|closed|popup|denied/i.test(msg);

        // The managed OAuth popup can report "cancelled" just before its
        // successful session handoff finishes. Confirm the actual auth state
        // only for that known transient result. Real OAuth errors are shown
        // immediately instead of looking like a 15-second hang.
        if (cancelled && (await waitForGoogleSession())) {
          navigate({ to: "/" });
          return;
        }
        console.error(
          "Google sign-in error:",
          describeGoogleAuthError(result.error),
          (result.error as { stack?: string } | null)?.stack ?? "",
          result.error,
        );
        // Show the real reason even for "cancelled"-looking results: on Android
        // Credential Manager reports user-cancel and configuration failures
        // with the same wording, so silence hides genuine setup errors.
        toast.error(authErrorMessage(result.error, "google"));
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      // A non-error managed OAuth result means its generated wrapper has
      // already stored the session. The shared auth listener will publish it.
      navigate({ to: "/" });
    } catch (error) {
      console.error(
        "Google sign-in error:",
        describeGoogleAuthError(error),
        (error as { stack?: string } | null)?.stack ?? "",
        error,
      );
      toast.error(authErrorMessage(error, "google"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex flex-col items-center">
          <img src={logoImg} alt="VIP Life logo" className="h-28 w-28 object-contain" />
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-emerald-900">VIP</span>
            <span className="text-3xl font-semibold tracking-wide text-emerald-500">LIFE</span>
          </div>
        </Link>

        <h1 className="mt-6 text-center text-4xl font-extrabold tracking-tight text-slate-900">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-3 text-center text-lg text-slate-400">
          {mode === "signin" ? "Sign in to VIP Life" : "Join the VIP Life community"}
        </p>

        {mode === "signup" && (
          <div className="mt-6">
            <label className="flex items-start gap-2 text-sm text-slate-800 select-none cursor-pointer bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <span className="leading-snug">
                I have read and agree to the{" "}
                <Link to="/terms" target="_blank" className="text-emerald-700 font-bold underline">
                  Terms &amp; Conditions
                </Link>
              </span>
            </label>
          </div>
        )}

        <div className="mt-8 flex items-center rounded-full border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => onGoogle(false)}
            disabled={busy || (mode === "signup" && !agreedTerms)}
            className="flex-1 flex items-center justify-center gap-4 py-4 text-lg font-medium text-slate-800 disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="w-px h-7 bg-slate-200" />
          <button
            type="button"
            onClick={() => onGoogle(true)}
            disabled={busy || (mode === "signup" && !agreedTerms)}
            title="Choose a different Google account"
            aria-label="Choose a different Google account"
            className="px-5 py-4 flex items-center justify-center disabled:opacity-50"
          >
            <ChevronDown className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="my-7 flex items-center gap-4 text-base text-slate-400">
          <div className="flex-1 h-px bg-slate-200" /> OR{" "}
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={busy || (mode === "signup" && !agreedTerms)}
            className="w-full py-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-base text-slate-400">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-emerald-600 font-bold hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}


function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
