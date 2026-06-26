import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listReports, resolveReport, deletePost, updateUserFlag } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { CheckCircle2, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const list = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const delPost = useServerFn(deletePost);
  const flag = useServerFn(updateUserFlag);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void; title: string; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", reason, status, page],
    queryFn: () => list({ data: { reason: reason || undefined, status: status || undefined, page, pageSize: 20 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "reports"] });
  const act = async (fn: () => Promise<unknown>, m: string) => {
    try { await fn(); toast.success(m); invalidate(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Report Center</h1>
        <div className="flex gap-2">
          <input value={reason} onChange={(e) => { setReason(e.target.value); setPage(0); }}
            placeholder="Filter by reason"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="">All</option><option value="pending">Pending</option><option value="resolved">Resolved</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {isLoading ? <Card><div className="h-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></Card>
        : (data?.rows ?? []).length === 0 ? <Card><div className="text-center text-slate-500 py-6">No reports</div></Card>
        : (data?.rows ?? []).map((r: any) => (
          <Card key={r.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 ${r.status === "resolved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {r.status}
                  </span>
                  <span>•</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 font-semibold">Reason: {r.reason}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Reporter: {r.reporter?.display_name ?? "Anonymous"}
                </div>
                {r.posts && (
                  <div className="mt-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Reported post</div>
                    {r.posts.media_url && r.posts.media_type === "image" && (
                      <img src={r.posts.media_url} className="h-24 rounded object-cover" alt="" />
                    )}
                    <div className="line-clamp-2">{r.posts.caption}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status !== "resolved" && (
                  <button onClick={() => act(() => resolve({ data: { reportId: r.id } }), "Resolved")}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                  </button>
                )}
                {r.posts && (
                  <button onClick={() => setConfirm({
                    title: "Delete reported post?", msg: "This will permanently delete the post.",
                    action: () => act(async () => { await delPost({ data: { postId: r.posts.id } }); await resolve({ data: { reportId: r.id } }); }, "Deleted & resolved"),
                  })}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                    <Trash2 className="h-3.5 w-3.5" /> Delete post
                  </button>
                )}
                {r.posts?.user_id && (
                  <button onClick={() => setConfirm({
                    title: "Ban the post owner?", msg: "User will lose access immediately.",
                    action: () => act(() => flag({ data: { userId: r.posts.user_id, is_banned: true } }), "User banned"),
                  })}
                    className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                    <Ban className="h-3.5 w-3.5" /> Ban user
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{data?.count ?? 0} total</div>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <button disabled={(page + 1) * 20 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title ?? ""} message={confirm?.msg ?? ""}
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }} />
    </div>
  );
}
