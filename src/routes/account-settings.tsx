import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
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
      { property: "og:title", content: "Account Settings — VIP Life" },
      { property: "og:description", content: "Manage your VIP Life account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Manage your VIP Life account settings.",
      },
    ],
  }),
});

function AccountSettingsPage() {
  const { t } = useI18n();
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
            {t("account.title")}
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#19D66B] bg-[#005A35]">
          <Link
       to="/account-edit"
  className="flex items-center gap-3 px-5 py-4 text-white hover:bg-[#006B3F] transition"
>
  <UserRound className="h-5 w-5 text-[#7CFF3B]" />

  <span className="flex-1">
    <span className="block font-semibold">{t("account.edit")}</span>
    <span className="block text-sm text-white/70">
      {t("account.editHelp")}
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
              <span className="block font-semibold">{t("account.privacy")}</span>
              <span className="block text-sm text-white/70">
                {t("account.privacyHelp")}
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
              <span className="block font-semibold">{t("account.about")}</span>
              <span className="block text-sm text-white/70">
                {t("account.aboutHelp")}
              </span>
            </span>

            <ChevronRight className="h-5 w-5 text-white/70" />
          </Link>
        </div>
      </div>
    </div>
  );
}
