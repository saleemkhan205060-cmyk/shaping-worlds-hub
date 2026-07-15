import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout, Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import {
  listModerationLogs,
  approveModerationLog,
  rejectModerationLog,
  listModerationRules,
  upsertModerationRule,
  deleteModerationRule,
} from "@/lib/moderation-admin.functions";
import { Check, X, Loader2, Plus, Power, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/moderation")({ component: ModerationPage });

function ModerationPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rose-500" />
          <h1 className="text-2xl font-bold">Content Moderation</h1>
        </div>
        <BlockedList />
        <RulesEditor />
      </div>
    </AdminLayout>
  );
}

function BlockedList() {
  const list = useServerFn(listModerationLogs);
  const approve = useServerFn(approveModerationLog);
  const reject = useServerFn(rejectModerationLog);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"blocked" | "approved" | "rejected" | "all">("blocked");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void; title: string; msg: string; danger?: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mod-logs", status, page],
    queryFn: () => list({ data: { status, page } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mod-logs"] });

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-bold">Blocked media</h2>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setPage(0); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="blocked">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : (data?.rows ?? []).length === 0 ? (
        <div className="text-center text-sm text-slate-500 py-8">Nothing to review 🎉</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.rows ?? []).map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative">
                {row.media_type === "video" ? (
                  <video src={row.media_url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={row.media_url} alt="" className="w-full h-full object-cover" />
                )}
                <span className="absolute top-2 left-2 rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5">
                  {row.reason ?? "unsafe"}
                </span>
                <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 capitalize">
                  {row.status}
                </span>
              </div>
              <div className="p-3 space-y-1 text-sm">
                <div className="font-semibold truncate">{row.profiles?.display_name ?? "Unknown"}</div>
                {row.caption && <p className="text-xs text-slate-500 line-clamp-2">{row.caption}</p>}
                <div className="text-[11px] text-slate-400">{new Date(row.created_at).toLocaleString()}</div>
                {row.status === "blocked" && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        setConfirm({
                          title: "Approve this content?",
                          msg: "It will be published on behalf of the user.",
                          action: async () => {
                            try { await approve({ data: { id: row.id } }); toast.success("Approved"); invalidate(); }
                            catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          },
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold py-1.5 hover:bg-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() =>
                        setConfirm({
                          title: "Reject and delete?",
                          msg: "The file will be permanently removed.",
                          danger: true,
                          action: async () => {
                            try { await reject({ data: { id: row.id } }); toast.success("Rejected"); invalidate(); }
                            catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          },
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-xs font-semibold py-1.5"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">{data?.count ?? 0} total</div>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <button disabled={(page + 1) * 20 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm} title={confirm?.title ?? ""} message={confirm?.msg ?? ""}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
      />
    </Card>
  );
}

function RulesEditor() {
  const list = useServerFn(listModerationRules);
  const upsert = useServerFn(upsertModerationRule);
  const del = useServerFn(deleteModerationRule);
  const qc = useQueryClient();
  const [newRule, setNewRule] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mod-rules"],
    queryFn: () => list(),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["mod-rules"] });

  const add = async () => {
    if (!newRule.trim()) return;
    try {
      await upsert({ data: { rule: newRule.trim(), enabled: true } });
      setNewRule("");
      toast.success("Rule added");
      invalidate();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <Card>
      <h2 className="text-lg font-bold mb-1">Safety rules</h2>
      <p className="text-xs text-slate-500 mb-4">
        Enabled rules are appended to the AI safety prompt for every image and video check. Keep each rule short and specific.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          maxLength={500}
          placeholder="e.g. Block images showing full credit card numbers"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-semibold hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-2">
          {(data?.rows ?? []).map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
              <div className="flex-1">
                <div className={`text-sm ${r.enabled ? "" : "text-slate-400 line-through"}`}>{r.rule}</div>
                <div className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <button
                onClick={async () => { await upsert({ data: { id: r.id, rule: r.rule, enabled: !r.enabled } }); invalidate(); }}
                title={r.enabled ? "Disable" : "Enable"}
                className={`rounded-lg p-1.5 ${r.enabled ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={async () => { await del({ data: { id: r.id } }); invalidate(); }}
                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {(data?.rows ?? []).length === 0 && (
            <li className="text-center text-sm text-slate-500 py-4">No custom rules yet.</li>
          )}
        </ul>
      )}
    </Card>
  );
}
