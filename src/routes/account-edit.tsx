import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
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
            .select("display_name, bio, location, website")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("profile_about")
            .select(
              "dob, email, gender, languages, marital_status, education, profession",
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
        setLocation(profileResult.data.location ?? "");
        setWebsite(profileResult.data.website ?? "");
      }

      if (aboutResult.data) {
        setDob(aboutResult.data.dob ?? "");
        setEmail(aboutResult.data.email ?? "");
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

    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 1)) {
      setSaveMessage("Please enter a valid age.");
      setSaving(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
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

    setSaveMessage("Account updated successfully.");
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#003D25]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#19D66B] bg-[#005A35] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">About You</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Gender
                </label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="Male / Female"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Language
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. Urdu, English, Arabic"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Marital Status
                </label>
                <input
                  type="text"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  placeholder="e.g. Single, Married"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Education
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Enter your education"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Profession
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Enter your profession"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Living In
                </label>
                <input
                  type="text"
                  value={livingIn}
                  onChange={(e) => setLivingIn(e.target.value)}
                  placeholder="e.g. Saudi Arabia"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Religion
                </label>
                <input
                  type="text"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="e.g. Islam"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  Date of Birth
                </label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#7CFF3B]"
                />
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className="rounded-xl border border-[#19D66B] bg-[#005A35] px-4 py-3 text-center text-sm font-medium text-white">
              {saveMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#19D66B] px-5 py-3 font-bold text-[#003D25] transition hover:bg-[#7CFF3B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
