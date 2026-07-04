import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPublicLegal } from "@/lib/admin.functions";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — VIP Life" },
      { name: "description", content: "VIP Life Terms & Conditions." },
    ],
  }),
});

function TermsPage() {
  const fn = useServerFn(getPublicLegal);
  const { data, isLoading } = useQuery({ queryKey: ["public-legal"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
        <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Terms &amp; Conditions</h1>
        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="mt-6 whitespace-pre-wrap text-sm sm:text-base text-slate-700 leading-relaxed">
            {data?.terms?.trim() || "Terms & Conditions have not been set yet."}
          </div>
        )}
      </div>
    </div>
  );
}
