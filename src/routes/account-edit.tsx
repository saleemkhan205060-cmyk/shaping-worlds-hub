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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#19D66B] bg-[#005A35] text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <h1 className="text-2xl font-extrabold text-white">
            Edit Account
          </h1>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="rounded-3xl border border-[#19D66B] bg-[#005A35] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Bio
                </label>
                <textarea
                  rows={4}
                  maxLength={80}
                  placeholder="Tell people about yourself"
                  className="w-full resize-none rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
                <p className="mt-1 text-xs text-white/50">
                  Maximum 80 characters
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter your location"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Website
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>
            </div>
          </div>

          {/* About */}
          <div className="rounded-3xl border border-[#19D66B] bg-[#005A35] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">
              About You
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Date of Birth
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1995-04-12"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#19D66B] px-5 py-3 font-bold text-[#003D25] transition hover:bg-[#7CFF3B]"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
