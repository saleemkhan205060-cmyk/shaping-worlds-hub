import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Info,
  ChevronRight,
  UserRound,
} from "lucide-react";

export const Route = createFileRoute("/account-settings")({
  component: AccountSettingsPage,
  head: () => ({
    meta: [
      { title: "Account Settings — VIP Life" },
      {
        name: "description",
        content: "Manage your VIP Life account settings.",
      },
    ],
  }),
});

function AccountSettingsPage() {
  return (
    <div className="min-h-screen bg-[#003D25] px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/"
            className="h-10 w-10 rounded-full bg-[#005A35] border border-[#19D66B] flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <h1 className="text-2xl font-extrabold text-white">
            Account Settings
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#19D66B] bg-[#005A35]">
          <Link
       to="/account-edit"
  className="flex items-center gap-3 px-5 py-4 text-white hover:bg-[#006B3F] transition"
>
  <UserRound className="h-5 w-5 text-[#7CFF3B]" />

  <span className="flex-1">
    <span className="block font-semibold">Edit Account</span>
    <span className="block text-sm text-white/70">
      Edit your profile and account information
    </span>
  </span>

   <ChevronRight className="h-5 w-5 text-white/70" />
      </Link>

         <div className="border-t border-[#19D66B]/40" />
          <Link
            to="/privacy"
            className="flex items-center gap-3 px-5 py-4 text-white hover:bg-[#006B3F] transition"
          >
            <FileText className="h-5 w-5 text-[#7CFF3B]" />

            <span className="flex-1">
              <span className="block font-semibold">Privacy Policy</span>
              <span className="block text-sm text-white/70">
                Read VIP Life privacy policy
              </span>
            </span>

            <ChevronRight className="h-5 w-5 text-white/70" />
          </Link>

          <div className="border-t border-[#19D66B]/40" />

          <Link
            to="/about"
            className="flex items-center gap-3 px-5 py-4 text-white hover:bg-[#006B3F] transition"
          >
            <Info className="h-5 w-5 text-[#7CFF3B]" />

            <span className="flex-1">
              <span className="block font-semibold">About VIP Life</span>
              <span className="block text-sm text-white/70">
                Learn more about VIP Life
              </span>
            </span>

            <ChevronRight className="h-5 w-5 text-white/70" />
          </Link>
        </div>
      </div>
    </div>
  );
}
