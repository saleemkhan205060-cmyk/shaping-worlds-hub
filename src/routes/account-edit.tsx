import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/account-edit")({
  component: AccountEditPage,
  head: () => ({
    meta: [
      { title: "Edit Account — VIP Life" },
      {
        name: "description",
        content: "Edit your VIP Life account information.",
      },
    ],
  }),
});

function AccountEditPage() {
  return (
    <div className="min-h-screen bg-[#003D25] px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/account-settings"
            className="h-10 w-10 rounded-full bg-[#005A35] border border-[#19D66B] flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <h1 className="text-2xl font-extrabold text-white">
            Edit Account
          </h1>
        </div>

        <div className="rounded-3xl border border-[#19D66B] bg-[#005A35] p-5">
          <p className="text-white/80">
            Edit your account information here.
          </p>

          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#19D66B] px-5 py-3 font-bold text-[#003D25]"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
