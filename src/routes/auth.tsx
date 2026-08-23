import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  publishAuthenticatedSession,
  useAuth,
} from "@/hooks/use-auth";
import {
  describeGoogleAuthError,
  signInWithGoogle,
  signInWithNativeGoogle,
  waitForAuthSession,
} from "@/lib/google-auth";

import { toast } from "sonner";
import { ChevronDown, Globe, Loader2 } from "lucide-react";
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
  const leavingAuthRef = useRef(false);

  const leaveAuth = useCallback(() => {
    if (leavingAuthRef.current) return;
    leavingAuthRef.current = true;
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const authErrorMessage = (error: unknown, action: "signin" | "signup" | "google") => {
    const authError = error as { code?: string; message?: string; status?: number };
    const message = String(authError?.message ?? "");
    const code = String(authError?.code ?? "");

    if (code === "weak_password" || /weak|easy to guess|pwned/i.test(message)) {
      return "Password must be at least 6 characters.";
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

  useEffect(() => {
    if (!authLoading && user) leaveAuth();
  }, [user, authLoading, leaveAuth]);

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
          leaveAuth();
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
        leaveAuth();
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      toast.error(authErrorMessage(err, mode));
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = () => {
    const target = email.trim();
    void navigate({
      to: "/reset-password",
      search: { email: target || undefined },
    });
  };


  // The arrow opens the native Google account chooser. Its result MUST be
  // awaited and handled here: previously the promise was fired and forgotten,
  // so a failed (or successful-but-unannounced) sign-in silently left the user
  // on this screen after picking an account.
  const onGoogleAccountChooser = async () => {
    if (mode === "signup" && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithNativeGoogle();
      if (result.error) throw result.error;
      if (!result.redirected) {
        toast.success("Welcome back!");
        leaveAuth();
      }
    } catch (error) {
      console.error("Google account chooser error:", describeGoogleAuthError(error), error);
      // The account handoff can report failure while the session is still being
      // written. Treat an already-persisted session as success.
      const session = await waitForAuthSession(8_000);
      if (session) {
        publishAuthenticatedSession(session);
        toast.success("Welcome back!");
        leaveAuth();
        return;
      }
      toast.error(authErrorMessage(error, "google"));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    if (mode === "signup" && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setBusy(true);
    try {
      // One Google path only: Android uses the native Credential Manager
      // account list; web uses the managed popup. This avoids the competing
      // GSI/FedCM initialization that made the button intermittently fail.
      const result = await signInWithGoogle({
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        toast.success("Welcome back!");
        leaveAuth();
      }
    } catch (error) {
      console.error("Google sign-in error:", describeGoogleAuthError(error), error);
      toast.error(authErrorMessage(error, "google"));
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            <Globe className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-sm">SHAPING</div>
            <div className="font-extrabold text-sm -mt-1 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
              WORLD
            </div>
          </div>
        </Link>

        <h1 className="text-2xl font-extrabold text-center">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1">
          {mode === "signin" ? "Sign in to VIP Life" : "Join the VIP Life community"}
        </p>

        {mode === "signup" && (
          <div className="mt-5">
            <label className="flex items-start gap-2 text-sm text-slate-800 select-none cursor-pointer bg-amber-50 border-2 border-amber-300 rounded-xl p-3 shadow-sm">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              />
              <span className="leading-snug">
                I have read and agree to the{" "}
                <Link to="/terms" target="_blank" className="text-indigo-600 font-bold underline">
                  Terms &amp; Conditions
                </Link>
              </span>
            </label>
          </div>
        )}

        <div className={mode === "signup" ? "mt-3" : "mt-6"}>
          <div
            className={`flex items-center gap-2 ${
              mode === "signup" && !agreedTerms ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => void onGoogle()}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 text-sm font-semibold whitespace-nowrap border border-slate-200 rounded-full hover:bg-slate-50 disabled:opacity-50"
             >
              <GoogleIcon /> Continue with Google
            </button>
            <button
              type="button"
              aria-label="Choose a Google account"
              onClick={() => void onGoogleAccountChooser()}
              disabled={busy}
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
            >

              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>




        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" /> OR{" "}
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void onForgotPassword()}
                disabled={busy}
                className="text-sm font-semibold text-[#117d43] hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={busy || (mode === "signup" && !agreedTerms)}
            className="w-full py-2.5 rounded-full bg-[#117d43] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[#117d43] font-semibold hover:underline"
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
