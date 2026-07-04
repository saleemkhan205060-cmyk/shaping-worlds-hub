import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/admin.functions";
import { Card } from "@/components/admin/AdminLayout";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => get() });
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id, updated_at, updated_by, ...rest } = form;
      await upd({ data: rest });
      toast.success("Settings saved successfully.");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed to save settings"); }
    finally { setBusy(false); }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const fb = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.checked });

  return (
    <div className="space-y-4 pb-32">
      <h1 className="text-2xl font-bold">App Settings</h1>
      <form onSubmit={save} className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-semibold">Branding</h2>
          <Field label="App Name"><input value={form.app_name ?? ""} onChange={f("app_name")} className={inp} /></Field>
          <Field label="Logo URL"><input value={form.logo_url ?? ""} onChange={f("logo_url")} className={inp} /></Field>
          <Field label="Banner URL"><input value={form.banner_url ?? ""} onChange={f("banner_url")} className={inp} /></Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Contact</h2>
          <Field label="Contact Email"><input value={form.contact_email ?? ""} onChange={f("contact_email")} className={inp} /></Field>
          <Field label="Contact Phone"><input value={form.contact_phone ?? ""} onChange={f("contact_phone")} className={inp} /></Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Legal</h2>
          <Field label="Privacy Policy"><textarea rows={6} value={form.privacy_policy ?? ""} onChange={f("privacy_policy")} className={inp} /></Field>
          <Field label="Terms & Conditions"><textarea rows={6} value={form.terms ?? ""} onChange={f("terms")} className={inp} /></Field>
        </Card>
        <Card>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.maintenance_mode ?? false} onChange={fb("maintenance_mode")} className="h-5 w-5" />
            <div>
              <div className="font-semibold">Maintenance mode</div>
              <div className="text-xs text-slate-500">Visible flag for clients; does not auto-block traffic.</div>
            </div>
          </label>
        </Card>
        <div className="sticky bottom-4 z-50 mt-6 flex justify-end rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <button type="submit" disabled={busy}
            className="ml-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50 sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>

      </form>
    </div>
  );
}


const inp = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</span>{children}</label>;
}
