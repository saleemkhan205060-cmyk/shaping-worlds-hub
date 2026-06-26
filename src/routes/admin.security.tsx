import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAuditLogs, getLoginHistory, getFailedLogins } from "@/lib/admin.functions";
import { Card } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/security")({ component: SecurityPage });

function SecurityPage() {
  const [tab, setTab] = useState<"audit" | "logins" | "failed">("audit");
  const audit = useServerFn(getAuditLogs);
  const logins = useServerFn(getLoginHistory);
  const failed = useServerFn(getFailedLogins);

  const { data: auditData } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => audit({ data: { page: 0, pageSize: 100 } }), enabled: tab === "audit" });
  const { data: loginsData } = useQuery({ queryKey: ["admin", "logins"], queryFn: () => logins(), enabled: tab === "logins" });
  const { data: failedData } = useQuery({ queryKey: ["admin", "failed"], queryFn: () => failed(), enabled: tab === "failed" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Security & Audit</h1>
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "audit", label: "Admin Activity" },
          { id: "logins", label: "Login History" },
          { id: "failed", label: "Failed Logins" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        {tab === "audit" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th>
            </tr></thead>
            <tbody>{(auditData?.rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{r.admin?.display_name ?? r.admin_id.slice(0, 8)}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.target_type}{r.target_id ? `/${r.target_id.slice(0, 8)}` : ""}</td>
              </tr>
            ))}{(auditData?.rows ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No activity</td></tr>}</tbody>
          </table>
        )}
        {tab === "logins" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">User</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">User Agent</th>
            </tr></thead>
            <tbody>{(loginsData?.rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{r.user?.display_name ?? r.user_id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-xs">{r.ip_address ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-slate-500 max-w-md truncate">{r.user_agent ?? "—"}</td>
              </tr>
            ))}{(loginsData?.rows ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No history</td></tr>}</tbody>
          </table>
        )}
        {tab === "failed" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">IP</th>
            </tr></thead>
            <tbody>{(failedData?.rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2 text-xs text-red-600">{r.reason}</td>
                <td className="px-4 py-2 text-xs">{r.ip_address ?? "—"}</td>
              </tr>
            ))}{(failedData?.rows ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No failed logins</td></tr>}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
