import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { deleteOwnAccount } from "@/lib/account.functions";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

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
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const deleteAccountFn = useServerFn(deleteOwnAccount);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");

  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [emailVisibility, setEmailVisibility] = useState("Private");
  const [gender, setGender] = useState("");
  const [languages, setLanguages] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");

  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [livingIn, setLivingIn] = useState("");
  const [religion, setReligion] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const loadAccountData = async () => {
      setLoading(true);

      const [profileResult, aboutResult, marriageResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, bio, website")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("profile_about")
            .select(
              "dob, email, email_private, gender, languages, marital_status, education, profession, country",
            )
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("marriage_profiles")
            .select("age, city, living_in, religion")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (profileResult.data) {
        setName(profileResult.data.display_name ?? "");
        setBio(profileResult.data.bio ?? "");
        setWebsite(profileResult.data.website ?? "");
      }

      if (aboutResult.data) {
        setDob(aboutResult.data.dob ?? "");
        setEmail(aboutResult.data.email ?? "");
        setEmailVisibility(
          aboutResult.data.email_private ? "Private" : "Public",
        );
        setCountry(aboutResult.data.country ?? "");
        setGender(aboutResult.data.gender ?? "");
        setLanguages(aboutResult.data.languages ?? "");
        setMaritalStatus(aboutResult.data.marital_status ?? "");
        setEducation(aboutResult.data.education ?? "");
        setProfession(aboutResult.data.profession ?? "");
      }

      if (marriageResult.data) {
        setAge(marriageResult.data.age?.toString() ?? "");
        setCity(marriageResult.data.city ?? "");
        setLivingIn(marriageResult.data.living_in ?? "");
        setReligion(marriageResult.data.religion ?? "");
      }

      setLoading(false);
    };

    loadAccountData();
  }, [user, authLoading]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage("");

    const parsedAge = age.trim() ? Number(age) : null;

    if (
      parsedAge !== null &&
      (!Number.isInteger(parsedAge) || parsedAge < 1)
    ) {
      setSaveMessage(t("accountEdit.validAge"));
      setSaving(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        bio: bio.trim(),
        website: website.trim(),
      })
      .eq("id", user.id);

    if (profileResult.error) {
      setSaveMessage(profileResult.error.message);
      setSaving(false);
      return;
    }

    const aboutResult = await supabase
      .from("profile_about")
      .upsert(
        {
          user_id: user.id,
          dob: dob.trim(),
          email: email.trim(),
          email_private: emailVisibility === "Private",
          country: country.trim(),
          gender: gender.trim(),
          languages: languages.trim(),
          marital_status: maritalStatus.trim(),
          education: education.trim(),
          profession: profession.trim(),
        },
        { onConflict: "user_id" },
      );

    if (aboutResult.error) {
      setSaveMessage(aboutResult.error.message);
      setSaving(false);
      return;
    }

    const marriageResult = await supabase
      .from("marriage_profiles")
      .upsert(
        {
          user_id: user.id,
          age: parsedAge,
          city: city.trim(),
          living_in: livingIn.trim(),
          religion: religion.trim(),
        },
        { onConflict: "user_id" },
      );

    if (marriageResult.error) {
      setSaveMessage(marriageResult.error.message);
      setSaving(false);
      return;
    }

    setSaveMessage(t("accountEdit.updated"));
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user) return;

    setDeleting(true);
    setSaveMessage("");

    try {
      await deleteAccountFn();
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : t("accountEdit.deleteFailed"));
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#003D25]">
        <div className="text-white">{t("accountEdit.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#003D25] px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/account-settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#19D66B] bg-[#005A35] text-white transition hover:bg-[#007342]"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>

          <h1 className="text-xl font-extrabold text-white sm:text-2xl">
            {t("accountEdit.title")}
          </h1>
        </div>

        <div className="space-y-2">
          {/* BASIC INFORMATION */}
          <div className="rounded-2xl border border-[#19D66B] bg-[#005A35] p-4">
            <h2 className="mb-3 text-base font-bold text-white">
              {t("accountEdit.basicInfo")}
            </h2>

            <div className="space-y-2">
              {/* NAME */}
              <div>
                <label className="mb-0.5 block text-xs font-medium text-white">
                  {t("accountEdit.name")}
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("accountEdit.enterName")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

             {/* ABOUT */}
             <div>
             <label className="mb-1 block text-xs font-medium text-white">
            {t("accountEdit.about")}
            </label>

             <textarea
               rows={5}
                maxLength={120}
                 value={bio}
                  onChange={(e) => setBio(e.target.value)}
                   placeholder={t("accountEdit.aboutPlaceholder")}
                   className="min-h-[40px] w-full resize-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 py-2 text-sm leading-5 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                   />

                  <p className="mt-0.5 text-[10px] text-white/45">
                  {t("accountEdit.maxChars")}
                </p>
                </div>

              {/* COUNTRY */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.country")}
                </label>

                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 pr-9 text-sm text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">{t("accountEdit.selectCountry")}</option>
                    <option value="Afghanistan">Afghanistan</option>
                    <option value="Albania">Albania</option>
                    <option value="Algeria">Algeria</option>
                    <option value="Australia">Australia</option>
                    <option value="Austria">Austria</option>
                    <option value="Bahrain">Bahrain</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Canada">Canada</option>
                    <option value="China">China</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Egypt">Egypt</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="India">India</option>
                    <option value="Indonesia">Indonesia</option>
                    <option value="Iran">Iran</option>
                    <option value="Iraq">Iraq</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Italy">Italy</option>
                    <option value="Japan">Japan</option>
                    <option value="Jordan">Jordan</option>
                    <option value="Kuwait">Kuwait</option>
                    <option value="Lebanon">Lebanon</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="Morocco">Morocco</option>
                    <option value="Nepal">Nepal</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Norway">Norway</option>
                    <option value="Oman">Oman</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Palestine">Palestine</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Qatar">Qatar</option>
                    <option value="Russia">Russia</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="Singapore">Singapore</option>
                    <option value="South Africa">South Africa</option>
                    <option value="South Korea">South Korea</option>
                    <option value="Spain">Spain</option>
                    <option value="Sri Lanka">Sri Lanka</option>
                    <option value="Sudan">Sudan</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Syria">Syria</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Tunisia">Tunisia</option>
                    <option value="Turkey">Turkey</option>
                    <option value="Ukraine">Ukraine</option>
                    <option value="United Arab Emirates">
                      United Arab Emirates
                    </option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Yemen">Yemen</option>
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white">
                    ▼
                  </span>
                </div>
              </div>

              {/* CITY */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.city")}
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("accountEdit.enterCity")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* WEBSITE */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.website")}
                </label>

                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>
            </div>
          </div>

          {/* ABOUT YOU */}
          <div className="rounded-2xl border border-[#19D66B] bg-[#005A35] p-4">
            <h2 className="mb-3 text-base font-bold text-white">{t("accountEdit.aboutYou")}</h2>

            <div className="space-y-3">
              {/* GENDER */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.gender")}
                </label>

                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 pr-9 text-sm text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">{t("accountEdit.selectGender")}</option>
                    <option value="Male">{t("accountEdit.gender.male")}</option>
                    <option value="Female">{t("accountEdit.gender.female")}</option>
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white">
                    ▼
                  </span>
                </div>
              </div>

              {/* AGE */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.age")}
                </label>

                <input
                  type="number"
                  min="1"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder={t("accountEdit.enterAge")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* LANGUAGE */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.language")}
                </label>

                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder={t("accountEdit.enterLanguage")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* MARITAL STATUS */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.maritalStatus")}
                </label>

                <div className="relative">
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 pr-9 text-sm text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">{t("accountEdit.selectMaritalStatus")}</option>
                    <option value="Single">{t("accountEdit.marital.single")}</option>
                    <option value="Married">{t("accountEdit.marital.married")}</option>
                    <option value="Divorced">{t("accountEdit.marital.divorced")}</option>
                    <option value="Widowed">{t("accountEdit.marital.widowed")}</option>
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white">
                    ▼
                  </span>
                </div>
              </div>

              {/* EDUCATION */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.education")}
                </label>

                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder={t("accountEdit.enterEducation")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* PROFESSION */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.profession")}
                </label>

                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder={t("accountEdit.enterProfession")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* LIVING IN */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.livingIn")}
                </label>

                <input
                  type="text"
                  value={livingIn}
                  onChange={(e) => setLivingIn(e.target.value)}
                  placeholder={t("accountEdit.livingInPlaceholder")}
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* RELIGION */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.religion")}
                </label>

                <div className="relative">
                  <select
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 pr-9 text-sm text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">{t("accountEdit.selectReligion")}</option>
                    <option value="Islam">{t("accountEdit.religion.islam")}</option>
                    <option value="Christianity">{t("accountEdit.religion.christianity")}</option>
                    <option value="Hinduism">{t("accountEdit.religion.hinduism")}</option>
                    <option value="Sikhism">{t("accountEdit.religion.sikhism")}</option>
                    <option value="Buddhism">{t("accountEdit.religion.buddhism")}</option>
                    <option value="Other">{t("accountEdit.religion.other")}</option>
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white">
                    ▼
                  </span>
                </div>
              </div>

              {/* DATE OF BIRTH */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.dob")}
                </label>

                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="e.g. 1995-04-12"
                  className="h-10 w-full rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white">
                  {t("accountEdit.email")}
                </label>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("accountEdit.enterEmail")}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                  />

                  <div className="relative w-[112px] shrink-0">
                 <select
                 value={emailVisibility}
               onChange={(e) => setEmailVisibility(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-[#19D66B]/60 bg-[#003D25] px-2 pr-7 text-xs font-medium text-white outline-none focus:border-[#7CFF3B]"
       >
      <option value="Public">{t("accountEdit.email.public")}</option>
         <option value="Private">{t("accountEdit.email.private")}</option>
         </select>

           {emailVisibility === "Private" && (
            <Lock className="pointer-events-none absolute right-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7CFF3B]" />
               )}

              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white">
              ▼
              </span>
               </div>
                </div>

                <p className="mt-1 text-[10px] text-white/45">
                  {t("accountEdit.emailHint")}
                </p>
              </div>
            </div>
          </div>

          {/* SAVE MESSAGE */}
          {saveMessage && (
            <div className="rounded-xl border border-[#19D66B] bg-[#005A35] px-3 py-2 text-center text-xs font-medium text-white">
              {saveMessage}
            </div>
          )}

          {/* SAVE + DELETE CONTAINER */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#19D66B] bg-[#19D66B] px-3 text-sm font-bold text-[#003D25] transition hover:bg-[#7CFF3B] disabled:cursor-not-allowed disabled:opacity-60"
            >
             <Save className="h-4 w-4" />
             {saving ? t("accountEdit.saving") : t("accountEdit.saveChanges")}
            </button>

            <button
             type="button"
              onClick={() => setDeleteOpen(true)}
             disabled={saving || deleting}
             className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#19D66B] hover:bg-red-600/15 px-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
             >
             <Trash2 className="h-4 w-4" />
            {t("accountEdit.delete")}
           </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION POPUP */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#19D66B] bg-[#005A35] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {t("accountEdit.deleteTitle")}
              </h3>

              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003D25] text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-5 text-sm leading-5 text-white/75">
              {t("accountEdit.deleteBody")}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="h-10 flex-1 rounded-lg border border-[#19D66B]/60 bg-[#003D25] text-sm font-semibold text-white transition hover:bg-[#004C30]"
              >
                {t("accountEdit.cancel")}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 flex-1 rounded-lg bg-red-500 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? t("accountEdit.deleting") : t("accountEdit.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
