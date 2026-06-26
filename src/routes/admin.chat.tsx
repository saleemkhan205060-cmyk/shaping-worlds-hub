import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMessageReports, deleteMessage, updateUserFlag } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { Trash2, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chat")({ component: ChatModPage });

function ChatModPage() {
  const list = useServerFn(listMessageReports);
  const del = useServerFn(deleteMessage);
  const flag = useServerFn(updateUserFlag);
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ action: () => void; title: string; msg: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "msg-reports"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "msg-reports"] });
  const act = async (fn: () => Promise<unknown>, m: string) => {
    try { await fn(); toast.success(m); invalidate(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chat Moderation</h1>
      <p className="text-sm text-slate-500">Only reported conversations are shown here to respect user privacy.</p>
      <div className="space-y-3">
        {isLoading ? <Card><div className="h-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></Card>
        : (data?.rows ?? []).length === 0 ? <Card><div className="text-center text-slate-500 py-6">No reported messages</div></Card>
        : (data?.rows ?? []).map((r: any) => (
          <Card key={r.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
                <div className="font-semibold">Reason: {r.reason}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Reported by {r.reporter?.display_name ?? "Anonymous"}</div>
                {r.messages && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Message:</div>
                    "{r.messages.content}"
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.messages && (
                  <>
                    <button onClick={() => setConfirm({
                      title: "Delete message?", msg: "This permanently removes the message.",
                      action: () => act(() => del({ data: { messageId: r.messages.id } }), "Deleted"),
                    })} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button onClick={() => setConfirm({
                      title: "Ban sender?", msg: "Sender will lose access immediately.",
                      action: () => act(() => flag({ data: { userId: r.messages.sender_id, is_banned: true } }), "Sender banned"),
                    })} className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                      <Ban className="h-3.5 w-3.5" /> Ban sender
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title ?? ""} message={confirm?.msg ?? ""}
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }} />
    </div>
  );
}
