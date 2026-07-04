import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/admin.functions";
import { Card } from "@/components/admin/AdminLayout";
import {
  Users, FileText, Video, Image as ImageIcon, MessageSquare, Heart,
  Flag, ThumbsUp, Eye, EyeOff, Ban, ShieldOff,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: DashboardPage });

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold">{value.toLocaleString()}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fn(),
    enabled: !loading && !!user,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of VIP Life</p>
      </div>
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><div className="h-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={data.totalUsers} accent="bg-indigo-500" />
          <StatCard icon={Eye} label="Active (7d)" value={data.activeUsers} accent="bg-emerald-500" />
          <StatCard icon={FileText} label="Total Posts" value={data.totalPosts} accent="bg-blue-500" />
          <StatCard icon={Video} label="Videos" value={data.totalVideos} accent="bg-rose-500" />
          <StatCard icon={ImageIcon} label="Photos" value={data.totalPhotos} accent="bg-amber-500" />
          <StatCard icon={MessageSquare} label="Comments" value={data.totalComments} accent="bg-purple-500" />
          <StatCard icon={ThumbsUp} label="Likes" value={data.totalLikes} accent="bg-pink-500" />
          <StatCard icon={Flag} label="Reports" value={data.totalReports} accent="bg-orange-500" />
          <StatCard icon={Heart} label="Marriage Profiles" value={data.totalMarriage} accent="bg-red-500" />
          <StatCard icon={EyeOff} label="Hidden Posts" value={data.hiddenPosts} accent="bg-slate-500" />
          <StatCard icon={Ban} label="Suspended" value={data.suspendedUsers} accent="bg-yellow-600" />
          <StatCard icon={ShieldOff} label="Banned" value={data.bannedUsers} accent="bg-red-700" />
        </div>
      )}
    </div>
  );
}
