import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listComments, updateCommentFlag, deleteComment } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { Search, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comments")({ component: CommentsPage });

function CommentsPage() {
  const list = useServerFn(listComments);
  const flag = useServerFn(updateCommentFlag);
  const del = useServerFn(deleteComment);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "comments", search, page],
    queryFn: () => list({ data: { search, page, pageSize: 20 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "comments"] });
  const act = async (fn: () => Promise<unknown>, m: string) => {
    try { await fn(); toast.success(m); invalidate(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Comment Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search comments..."
            className="rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </div>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr className="text-left">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
            : (data?.rows ?? []).length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No comments</td></tr>
            : (data?.rows ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{c.profiles?.display_name ?? "Unknown"}</td>
                <td className="px-4 py-3 max-w-md">
                  <div className={c.is_hidden ? "line-through text-slate-400" : ""}>{c.content}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => act(() => flag({ data: { commentId: c.id, is_hidden: !c.is_hidden } }), "Updated")}
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                      {c.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setConfirm({ action: () => act(() => del({ data: { commentId: c.id } }), "Deleted") })}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{data?.count ?? 0} total</div>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <button disabled={(page + 1) * 20 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>
      <ConfirmDialog open={!!confirm} title="Delete comment?" message="This cannot be undone."
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }} />
    </div>
  );
}
