import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { checkIsAdmin } from "@/lib/admin.functions";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({ component: AdminLoginPage });

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const check = useServerFn(checkIsAdmin);

  useEffect(() => {
    if (loading || !user) return;
    check().then((r) => {
      if (r.isAdmin) navigate({ to: "/admin" });
    }).catch(() => {});
  }, [user, loading, check, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await supabase.from("admin_failed_logins").insert({
          email, user_agent: navigator.userAgent, reason: error.message,
        });
        throw error;
      }
      const r = await check();
      if (!r.isAdmin) {
        await supabase.auth.signOut();
        toast.error("This account does not have admin access");
        return;
      }
      // Log success
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        await supabase.from("admin_login_history").insert({
          user_id: u.user.id, user_agent: navigator.userAgent, success: true,
        });
      }
      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message || "Sign-in failed");
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
        <h1 className="mt-4 text-center text-2xl font-extrabold">Admin Panel</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Sign in to manage VIP Life</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in to Admin
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-slate-400">
          <Link to="/" className="hover:underline">← Back to VIP Life</Link>
        </div>
      </div>
    </div>
  );
}
