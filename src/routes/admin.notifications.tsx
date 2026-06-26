import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sendNotification, listNotifications, listUsers } from "@/lib/admin.functions";
import { Card } from "@/components/admin/AdminLayout";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const send = useServerFn(sendNotification);
  const list = useServerFn(listNotifications);
  const users = useServerFn(listUsers);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [broadcast, setBroadcast] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: history } = useQuery({ queryKey: ["admin", "notifs"], queryFn: () => list() });
  const { data: userData } = useQuery({
    queryKey: ["admin", "notif-users", search],
    queryFn: () => users({ data: { search, pageSize: 30 } }),
    enabled: !broadcast,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    setBusy(true);
    try {
      await send({ data: { title, body, broadcast, userIds: broadcast ? undefined : selected } });
      toast.success("Notification sent");
      setTitle(""); setBody(""); setSelected([]);
      qc.invalidateQueries({ queryKey: ["admin", "notifs"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-3">Send announcement</h2>
          <form onSubmit={submit} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" required rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
              Send to all users (broadcast)
            </label>
            {!broadcast && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users to add..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800" />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {(userData?.rows ?? []).map((u: any) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1 cursor-pointer">
                      <input type="checkbox" checked={selected.includes(u.id)}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, u.id] : selected.filter(x => x !== u.id))} />
                      {u.display_name ?? "Unnamed"}
                    </label>
                  ))}
                </div>
                {selected.length > 0 && <div className="text-xs text-slate-500">{selected.length} selected</div>}
              </div>
            )}
            <button type="submit" disabled={busy || (!broadcast && selected.length === 0)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 py-2.5 font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Notification
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Recent notifications</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(history?.rows ?? []).map((n: any) => (
              <div key={n.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title}</div>
                  <span className="text-xs text-slate-500">{n.broadcast ? "Broadcast" : `${n.target_user_ids?.length ?? 0} users`}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{n.body}</div>
                <div className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(history?.rows ?? []).length === 0 && <div className="text-center text-slate-500 py-6">No notifications yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
