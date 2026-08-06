import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash and auto-creates a recovery session
    // Defer React work inside the auth listener to avoid running synchronous
    // state updates while Supabase holds its internal auth lock (this can
    // deadlock other auth/getSession requests and hang the UI after sign-in).
    const sub = supabase.auth.onAuthStateChange((event) => {
      setTimeout(() => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => { sub.data.subscription.unsubscribe(); };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can sign in now.");
      navigate({ to: "/admin/login" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
            <Shield className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold">Set New Password</h1>
        {!ready ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            Open this page from the password reset link in your email.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}
        <div className="mt-4 text-center text-xs text-slate-400">
          <Link to="/admin/login" className="hover:underline">← Back to admin login</Link>
        </div>
      </div>
    </div>
  );
}
