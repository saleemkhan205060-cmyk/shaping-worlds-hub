import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — VIP Life" },
      { name: "description", content: "VIP Life Terms & Conditions — community guidelines, user responsibilities, and platform rules." },
    ],
  }),
});

const TERMS = [
  "Users must behave respectfully and follow community guidelines.",
  "Uploading illegal, abusive, offensive, or harmful content is prohibited.",
  "Users are responsible for their own videos, photos, articles, messages, and shared files.",
  "Information provided in the marriage section should be accurate and genuine.",
  "Messaging, voice messages, and file sharing must not be used for spam, harassment, or fraud.",
  "Any violation of the rules may result in account suspension or permanent removal.",
  "Users should protect their personal information and use the platform responsibly.",
  "VIP Life reserves the right to update these terms and conditions at any time.",
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
        <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please read these terms carefully before using VIP Life. By creating an account you agree to abide by them.
        </p>
        <ol className="mt-6 space-y-4 list-decimal list-outside pl-5 text-sm sm:text-base text-slate-700 leading-relaxed">
          {TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-slate-400">
          Last updated: June 2026 · VIP Life
        </p>
      </div>
    </div>
  );
}
