import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listUsers, updateUserFlag, setUserRole, deleteUser, deleteAllUserContent } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { Search, Shield, Ban, CheckCircle2, Trash2, ShieldOff, Eraser, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const list = useServerFn(listUsers);
  const flag = useServerFn(updateUserFlag);
  const role = useServerFn(setUserRole);
  const del = useServerFn(deleteUser);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void; title: string; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search, page],
    queryFn: () => list({ data: { search, page, pageSize: 20 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); invalidate(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name..."
            className="rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : (data?.rows ?? []).length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found</td></tr>
            ) : (data?.rows ?? []).map((u: any) => (
              <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {u.display_name || "Unnamed"}
                        {u.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                      </div>
                      <div className="text-xs text-slate-500">{u.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.roles?.[0] ?? "user"}
                    onChange={(e) => act(() => role({ data: { userId: u.id, role: e.target.value as any } }), "Role updated")}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.is_banned ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">Banned</span>
                  : u.is_suspended ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Suspended</span>
                  : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Active</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button title={u.is_verified ? "Unverify" : "Verify"}
                      onClick={() => act(() => flag({ data: { userId: u.id, is_verified: !u.is_verified } }), "Updated")}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button title="Suspend"
                      onClick={() => act(() => flag({ data: { userId: u.id, is_suspended: !u.is_suspended } }), "Updated")}
                      className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950">
                      <Shield className="h-4 w-4" />
                    </button>
                    <button title="Ban"
                      onClick={() => act(() => flag({ data: { userId: u.id, is_banned: !u.is_banned } }), "Updated")}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                      {u.is_banned ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                    <button title="Delete"
                      onClick={() => setConfirm({
                        title: "Delete user?",
                        msg: `This permanently deletes ${u.display_name || "this user"} and all their data. Cannot be undone.`,
                        action: () => act(() => del({ data: { userId: u.id } }), "User deleted"),
                      })}
                      className="rounded p-1.5 text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
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
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <button disabled={(page + 1) * 20 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""} message={confirm?.msg ?? ""}
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
      />
    </div>
  );
}
