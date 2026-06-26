import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listPosts, updatePostFlag, deletePost } from "@/lib/admin.functions";
import { Card, ConfirmDialog } from "@/components/admin/AdminLayout";
import { Search, Eye, EyeOff, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ContentTable({ mediaType, title }: { mediaType: "all" | "image" | "video" | "text"; title: string }) {
  const list = useServerFn(listPosts);
  const flag = useServerFn(updatePostFlag);
  const del = useServerFn(deletePost);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hidden" | "pinned" | "reported">("all");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ action: () => void; title: string; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts", mediaType, search, filter, page],
    queryFn: () => list({ data: { mediaType, search, filter, page, pageSize: 20 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "posts"] });
  const act = async (fn: () => Promise<unknown>, m: string) => {
    try { await fn(); toast.success(m); invalidate(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(0); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="all">All</option>
            <option value="hidden">Hidden</option>
            <option value="pinned">Pinned</option>
            <option value="reported">Reported</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search caption..."
              className="rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><div className="h-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></Card>
        )) : (data?.rows ?? []).length === 0 ? (
          <div className="col-span-full text-center text-slate-500 py-8">No content found</div>
        ) : (data?.rows ?? []).map((p: any) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
              <div className="text-sm">
                <div className="font-medium">{p.profiles?.display_name ?? "Unknown"}</div>
                <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</div>
              </div>
            </div>
            {p.media_url && p.media_type === "image" && (
              <img src={p.media_url} className="h-40 w-full rounded-lg object-cover" alt="" />
            )}
            {p.media_url && p.media_type === "video" && (
              <video src={p.media_url} className="h-40 w-full rounded-lg object-cover" controls />
            )}
            {p.caption && <p className="text-sm line-clamp-3">{p.caption}</p>}
            <div className="flex flex-wrap gap-1">
              {p.is_hidden && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">Hidden</span>}
              {p.is_pinned && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Pinned</span>}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{p.media_type ?? "text"}</span>
            </div>
            <div className="flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button onClick={() => act(() => flag({ data: { postId: p.id, is_hidden: !p.is_hidden } }), "Updated")}
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" title={p.is_hidden ? "Restore" : "Hide"}>
                {p.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => act(() => flag({ data: { postId: p.id, is_pinned: !p.is_pinned } }), "Updated")}
                className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950" title="Pin">
                <Pin className="h-4 w-4" />
              </button>
              <button onClick={() => setConfirm({
                title: "Delete post?", msg: "This permanently removes the post.",
                action: () => act(() => del({ data: { postId: p.id } }), "Deleted"),
              })} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
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

      <ConfirmDialog
        open={!!confirm} title={confirm?.title ?? ""} message={confirm?.msg ?? ""}
        onCancel={() => setConfirm(null)} danger
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
      />
    </div>
  );
}

export const Route = createFileRoute("/admin/posts")({
  component: () => <ContentTable mediaType="all" title="Post Management" />,
});
