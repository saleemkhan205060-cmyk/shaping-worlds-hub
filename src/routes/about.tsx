import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About VIP Life — VIP Life" },
      {
        name: "description",
        content: "Learn more about VIP Life.",
      },
    ],
  }),
});

function AboutPage() {
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
            About VIP Life
          </h1>
        </div>

        <div className="rounded-3xl border border-[#19D66B] bg-[#005A35] p-6 text-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-12 w-12 rounded-full bg-[#003D25] border border-[#19D66B] flex items-center justify-center">
              <Info className="h-6 w-6 text-[#7CFF3B]" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold">VIP Life</h2>
              <p className="text-sm text-white/70">
                Connect • Share • Discover
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            VIP Life is a social platform designed to help people connect,
            share moments, discover new profiles, and build meaningful
            connections.
          </p>

          <div className="mt-6 border-t border-[#19D66B]/40 pt-5">
            <p className="text-sm text-white/70">
              Thank you for being part of VIP Life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
