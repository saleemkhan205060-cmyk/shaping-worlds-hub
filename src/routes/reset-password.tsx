import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getOAuthRedirectOrigin } from "@/lib/oauth-origin";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});

type Step = "email" | "code" | "password";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" });
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // If the user arrived via the emailed reset link, Supabase creates a recovery
  // session automatically — skip straight to setting the new password.
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      setTimeout(() => {
        if (event === "PASSWORD_RECOVERY") setStep("password");
      }, 0);
    });
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setStep("password");
      });
    }
    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${getOAuthRedirectOrigin()}/reset-password`,
      });
      if (error) throw error;
      toast.success("We sent a verification code to your email.");
      setStep("code");
      setResendIn(45);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      toast.error("Please enter the 6-digit code from your email");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "recovery",
      });
      if (error) throw error;
      if (!data.session) throw new Error("Code verification failed. Please try again.");
      toast.success("Code verified. Set your new password.");
      setStep("password");
    } catch (err: any) {
      toast.error(err?.message || "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. You can sign in now.");
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#117d43] focus:outline-none";
  const buttonClass =
    "flex w-full items-center justify-center gap-2 rounded-full bg-[#117d43] py-2.5 font-semibold text-white disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
            <Shield className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold">
          {step === "email" ? "Forgot password" : step === "code" ? "Enter your code" : "Set new password"}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {step === "email"
            ? "Enter your email and we'll send you a verification code."
            : step === "code"
              ? `We sent a 6-digit code to ${email}`
              : "Choose a new password for your account."}
        </p>

        {step === "email" && (
          <form onSubmit={sendCode} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send code
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              className={`${inputClass} text-center text-lg tracking-[0.5em] font-semibold`}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify code
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="flex items-center gap-1 text-slate-500 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Change email
              </button>
              <button
                type="button"
                disabled={busy || resendIn > 0}
                onClick={() => void sendCode()}
                className="font-semibold text-[#117d43] hover:underline disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={savePassword} className="mt-6 space-y-3">
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className={inputClass}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-xs text-slate-400">
          <Link to="/auth" className="hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
