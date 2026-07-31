import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { confirmAuthenticatedUser, useAuth } from "@/hooks/use-auth";
import { restoreNativeGoogleSession, signInWithGoogle } from "@/lib/google-auth";
import { toast } from "sonner";
import { Globe, Loader2, ChevronDown } from "lucide-react";
import { isNativeCapacitorApp } from "@/lib/native-share";
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

  const runAuthRequest = async <T,>(operation: Promise<T>): Promise<T> => {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error("Authentication request timed out")), 30_000);
      }),
    ]);
  };

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
    if (action === "google") return "Google sign-in failed. Please try again.";
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

  useEffect(() => {
    void restoreNativeGoogleSession()
      .then((restored) => {
        if (restored) {
          setBusy(false);
          navigate({ to: "/" });
        }
      })
      .catch((error) => {
        console.error("Google callback session restore failed:", error);
        setBusy(false);
      });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await runAuthRequest(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${getOAuthRedirectOrigin()}/`,
              data: { display_name: displayName || email.split("@")[0] },
            },
          }),
        );
        if (error) throw error;
        if (data.session) {
          if (!(await confirmAuthenticatedUser())) {
            throw new Error("Account session was not created");
          }
          toast.success("Account created!");
          navigate({ to: "/" });
        } else {
          toast.success("Account created! Check your email to confirm.");
        }
      } else {
        const { data, error } = await runAuthRequest(
          supabase.auth.signInWithPassword({ email, password }),
        );
        if (error) throw error;
        if (!data.session || !(await confirmAuthenticatedUser())) {
          throw new Error("Sign-in completed without a valid session");
        }
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
      const result = await runAuthRequest(
        signInWithGoogle({
          extraParams: chooseAccount ? { prompt: "select_account" } : undefined,
        }),
      );
      if (result.error) {
        // The managed OAuth popup can report "cancelled" just before its
        // successful session handoff finishes. Confirm the actual auth state
        // before treating that transient popup result as a failed sign-in.
        if (await waitForGoogleSession()) {
          navigate({ to: "/" });
          return;
        }
        const msg = String(result.error?.message ?? "");
        const cancelled = /cancel|closed|popup|denied/i.test(msg);
        console.error("Google sign-in error:", result.error);
        if (!cancelled) toast.error(authErrorMessage(result.error, "google"));
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      if (!(await waitForGoogleSession())) {
        throw new Error("Google sign-in completed without a valid session");
      }
      navigate({ to: "/" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error(authErrorMessage(error, "google"));
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

        <div
          className={`${mode === "signup" ? "mt-3" : "mt-6"} flex items-center border border-slate-200 rounded-full overflow-hidden hover:bg-slate-50 disabled:opacity-50`}
        >
          <button
            type="button"
            onClick={() => onGoogle(false)}
            disabled={busy || (mode === "signup" && !agreedTerms)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <button
            type="button"
            onClick={() => onGoogle(true)}
            disabled={busy || (mode === "signup" && !agreedTerms)}
            title="Choose a different Google account"
            aria-label="Choose a different Google account"
            className="px-3 flex items-center justify-center disabled:opacity-50"
          >
            <ChevronDown className="h-4 w-4 text-slate-600" />
          </button>
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
          <button
            type="submit"
            disabled={busy || (mode === "signup" && !agreedTerms)}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="text-indigo-600 font-semibold hover:underline"
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
