import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMarriage, updateMarriageStatus, deleteMarriage } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { Check, X, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/marriage")({ component: MarriagePage });

function MarriagePage() {
  const list = useServerFn(listMarriage);
  const upd = useServerFn(updateMarriageStatus);
  const del = useServerFn(deleteMarriage);
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "marriage", status, page],
    queryFn: () => list({ data: { status: status || undefined, page, pageSize: 20 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "marriage"] });
  const act = async (fn: () => Promise<unknown>, m: string) => {
    try { await fn(); toast.success(m); invalidate(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Marriage Profiles</h1>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option><option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><div className="h-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></Card>
        )) : (data?.rows ?? []).length === 0 ? <div className="col-span-full text-center text-slate-500 py-8">No profiles</div>
        : (data?.rows ?? []).map((m: any) => (
          <Card key={m.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} className="h-10 w-10 rounded-full" alt="" />
                : <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500" />}
              <div>
                <div className="font-semibold">{m.profiles?.display_name ?? "Unnamed"}</div>
                <div className="text-xs text-slate-500">{m.age ? `${m.age}, ` : ""}{m.country}</div>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <div>Looking for: {m.looking_for ?? "—"}</div>
              <div>Profession: {m.profession ?? "—"}</div>
              <div>Religion: {m.religion ?? "—"}</div>
            </div>
            {m.about && <p className="text-sm line-clamp-2">{m.about}</p>}
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
              m.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
              m.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
              m.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
              "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            }`}>{m.status}</span>
            <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button onClick={() => act(() => upd({ data: { profileId: m.id, status: "approved" } }), "Approved")}
                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">
                <Check className="h-3 w-3" /> Approve
              </button>
              <button onClick={() => act(() => upd({ data: { profileId: m.id, status: "rejected" } }), "Rejected")}
                className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                <X className="h-3 w-3" /> Reject
              </button>
              <button onClick={() => act(() => upd({ data: { profileId: m.id, status: "suspended" } }), "Suspended")}
                className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700">
                <Pause className="h-3 w-3" /> Suspend
              </button>
              <button onClick={() => setConfirm({ action: () => act(() => del({ data: { profileId: m.id } }), "Deleted") })}
                className="ml-auto flex items-center gap-1 rounded bg-slate-200 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:bg-slate-800 dark:text-red-300">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500">{data?.count ?? 0} total</div>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <button disabled={(page + 1) * 20 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>
      <ConfirmDialog open={!!confirm} title="Delete marriage profile?" message="This cannot be undone."
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }} />
    </div>
  );
}
