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
  const [country, setCountry] = useState("");
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
              "dob, email, gender, languages, marital_status, education, profession, country",
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
                  Country
                </label>

                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 pr-10 text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">Select Country</option>
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

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white">
                    ▼
                  </span>
                </div>
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

                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 pr-10 text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white">
                    ▼
                  </span>
                </div>
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

                <div className="relative">
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 pr-10 text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white">
                    ▼
                  </span>
                </div>
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

                <div className="relative">
                  <select
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#19D66B]/60 bg-[#003D25] px-4 py-3 pr-10 text-white outline-none focus:border-[#7CFF3B]"
                  >
                    <option value="">Select Religion</option>
                    <option value="Islam">Islam</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Sikhism">Sikhism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Other">Other</option>
                  </select>

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white">
                    ▼
                  </span>
                </div>
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
