import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Layout } from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Calendar, Users, MapPin, Briefcase, Heart, Moon, FileText, Save, Loader2, Search, ChevronDown, Globe, GraduationCap, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/marriage/edit")({
  component: MarriageEditPage,
});
const DATE_OF_BIRTH_MIN = new Date(1940, 0, 1);
const DATE_OF_BIRTH_MAX = new Date();

function DateOfBirthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <>
      <FieldRow icon={Calendar} label="Date of Birth">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-right text-slate-900 flex items-center gap-1"
        >
          {selectedDate ? (
            format(selectedDate, "dd MMM yyyy")
          ) : (
            <span className="text-slate-400">Select date</span>
          )}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </FieldRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Select Date of Birth</DialogTitle>

          <input
            type="date"
            min={format(DATE_OF_BIRTH_MIN, "yyyy-MM-dd")}
            max={format(DATE_OF_BIRTH_MAX, "yyyy-MM-dd")}
            value={value}
            onChange={(e) => {
              setOpen(false);
              onChange(e.target.value);
            }}
            className="w-full h-12 rounded-xl border border-slate-200 px-3 text-base"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
const LOOKING_FOR = ["Male", "Female"];
const MARITAL = ["Single", "Divorced", "Widowed"];
const RELIGIONS = ["Islam", "Christianity", "Hinduism", "Sikhism", "Buddhism", "Judaism", "Other", "Prefer not to say"];

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Congo (Democratic Republic)",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Korea (North)","Korea (South)",
  "Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania",
  "Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway",
  "Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands",
  "Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

function MarriageEditPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [lookingFor, setLookingFor] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [profession, setProfession] = useState<string>("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [religion, setReligion] = useState<string>("");
  const [about, setAbout] = useState<string>("");

const [dateOfBirth, setDateOfBirth] = useState<string>("");
const [height, setHeight] = useState<string>("");
const [motherTongue, setMotherTongue] = useState<string>("");
const [city, setCity] = useState<string>("");
const [livingIn, setLivingIn] = useState<string>("");
const [nationality, setNationality] = useState<string>("");
const [education, setEducation] = useState<string>("");
const [company, setCompany] = useState<string>("");
const [income, setIncome] = useState<string>("");
const [familyType, setFamilyType] = useState<string>("");
const [familyValues, setFamilyValues] = useState<string>("");
const [siblings, setSiblings] = useState<string>("");
const [familyLocation, setFamilyLocation] = useState<string>("");
const [smoking, setSmoking] = useState<string>("");
const [drinking, setDrinking] = useState<string>("");
const [diet, setDiet] = useState<string>("");
const [hobbies, setHobbies] = useState<string>("");
const [prefAge, setPrefAge] = useState<string>("");
const [prefHeight, setPrefHeight] = useState<string>("");
const [prefLocation, setPrefLocation] = useState<string>("");
const [prefEducation, setPrefEducation] = useState<string>("");
const [prefProfession, setPrefProfession] = useState<string>("");
const [otherExpectations, setOtherExpectations] = useState<string>("");
const [prefLivingIn, setPrefLivingIn] = useState<string>("");
const [prefNationality, setPrefNationality] = useState<string>("");
const [prefEducation2, setPrefEducation2] = useState<string>("");
const [prefIncome, setPrefIncome] = useState<string>("");
const [prefCity, setPrefCity] = useState<string>("");
const [prefMaritalStatus, setPrefMaritalStatus] = useState<string>("");
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: mp }] = await Promise.all([
        supabase.from("profiles").select("avatar_url, display_name, username").eq("id", user.id).maybeSingle(),
        supabase.from("marriage_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setAvatarUrl(prof?.avatar_url ?? null);
      setDisplayName(prof?.display_name ?? prof?.username ?? "");
      if (mp) {
        setAge(mp.age?.toString() ?? "");
        setGender(mp.gender ?? "");
        setLookingFor(mp.looking_for ?? "");
        setCountry(mp.country ?? "");
        setProfession(mp.profession ?? "");
        setMaritalStatus(mp.marital_status ?? "");
        setReligion(mp.religion ?? "");
setAbout(mp.about ?? "");

setDateOfBirth(mp.date_of_birth ?? "");
setHeight(mp.height ?? "");
setMotherTongue(mp.mother_tongue ?? "");
setCity(mp.city ?? "");
setLivingIn(mp.living_in ?? "");
setNationality(mp.nationality ?? "");
setEducation(mp.education ?? "");
setCompany(mp.company ?? "");
setIncome(mp.income ?? "");
setFamilyType(mp.family_type ?? "");
setFamilyValues(mp.family_values ?? "");
setSiblings(mp.siblings ?? "");
setFamilyLocation(mp.family_location ?? "");
setSmoking(mp.smoking ?? "");
setDrinking(mp.drinking ?? "");
setDiet(mp.diet ?? "");
setHobbies(mp.hobbies ?? "");
setPrefAge(mp.pref_age ?? "");
setPrefLocation(mp.pref_location ?? "");
setPrefEducation(mp.pref_education ?? "");
setPrefProfession(mp.pref_profession ?? "");
setOtherExpectations(mp.other_expectations ?? "");
setPrefLivingIn(mp.pref_living_in ?? "");
setPrefNationality(mp.pref_nationality ?? "");
setPrefEducation2(mp.pref_education_2 ?? "");
setPrefIncome(mp.pref_income ?? "");
setPrefCity(mp.pref_city ?? "");
setPrefMaritalStatus(mp.pref_marital_status ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const ageNum = age ? parseInt(age, 10) : null;
    if (ageNum !== null && (isNaN(ageNum) || ageNum < 18 || ageNum > 99)) {
      toast.error("Please enter a valid age (18–99).");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("marriage_profiles")
      .upsert(
        {
          user_id: user.id,
          age: ageNum,
          gender: gender || null,
          looking_for: lookingFor || null,
          country: country.trim() || null,
          profession: profession.trim() || null,
          marital_status: maritalStatus || null,
          religion: religion || null,
          about: about.trim() || null,
          date_of_birth: dateOfBirth || null,
height: height.trim() || null,
mother_tongue: motherTongue.trim() || null,
city: city.trim() || null,
living_in: livingIn.trim() || null,
nationality: nationality.trim() || null,
education: education.trim() || null,
company: company.trim() || null,
income: income.trim() || null,
family_type: familyType.trim() || null,
family_values: familyValues.trim() || null,
siblings: siblings.trim() || null,
family_location: familyLocation.trim() || null,
smoking: smoking.trim() || null,
drinking: drinking.trim() || null,
diet: diet.trim() || null,
hobbies: hobbies.trim() || null,
pref_age: prefAge.trim() || null,
pref_location: prefLocation.trim() || null,
pref_education: prefEducation.trim() || null,
pref_profession: prefProfession.trim() || null,
other_expectations: otherExpectations.trim() || null,
pref_living_in: prefLivingIn.trim() || null,
pref_nationality: prefNationality.trim() || null,
pref_education_2: prefEducation2.trim() || null,
pref_income: prefIncome.trim() || null,
pref_city: prefCity.trim() || null,
pref_marital_status: prefMaritalStatus.trim() || null,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Couldn't save your profile. Please try again.");
      return;
    }
    toast.success("Marriage profile saved");
    navigate({ to: "/marriage" });
  };

   const deleteProfile = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your Marriage profile?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("marriage_profiles")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      toast.error("Couldn't delete your profile. Please try again.");
      return;
    }

    toast.success("Marriage profile deleted");
    navigate({ to: "/marriage" });
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/marriage" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-extrabold flex-1 text-center text-white">Marriage Profile</h1>
        </div>

        <div className="flex flex-col items-center mb-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-full object-cover ring-4 ring-pink-100" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 ring-4 ring-pink-100 flex items-center justify-center text-white text-3xl font-bold">
              {(displayName || "U")[0]?.toUpperCase()}
            </div>
          )}
          <p className="mt-3 font-semibold text-white">{displayName || "Your profile"}</p>
          <p className="text-xs text-white/70">Using your account profile photo</p>
        </div>

        <div className="space-y-3">
          <div className="mb-2">
         <h2 className="text-lg font-bold text-white">Basic Information</h2>
          </div>
           <div className="bg-white border border-slate-200 rounded-2xl p-4">
  <div className="flex items-center gap-3 mb-2">
    <span className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
      <FileText className="h-5 w-5" />
    </span>
    <span className="font-semibold">About Me</span>
  </div>

  <textarea
    value={about}
    maxLength={100}
    onChange={(e) => setAbout(e.target.value)}
    rows={4}
    placeholder="Write something about yourself…"
    className="w-full resize-none text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
  />

  <div className="text-right text-xs text-slate-400">
    {about.length}/100
  </div>
</div>
          <FieldSelect icon={Users} label="Gender" value={gender} onChange={setGender}>
           <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
         </FieldSelect>
          <FieldSelect icon={Calendar} label="Age" value={age} onChange={setAge}>
            <option value="">Select age</option>
            {Array.from({ length: 82 }, (_, i) => 18 + i).map((n) => (
              <option key={n} value={n}>
           {n}
         </option>
        ))}
      </FieldSelect>

<FieldRow icon={Users} label="Height">
  <select
    value={height}
    onChange={(e) => setHeight(e.target.value)}
    className="w-full bg-transparent text-sm text-slate-900 outline-none"
  >
    <option value="">Select height</option>
    <option value="4'10">4'10"</option>
    <option value="4'11">4'11"</option>
    <option value="5'0">5'0"</option>
    <option value="5'1">5'1"</option>
    <option value="5'2">5'2"</option>
    <option value="5'3">5'3"</option>
    <option value="5'4">5'4"</option>
    <option value="5'5">5'5"</option>
    <option value="5'6">5'6"</option>
    <option value="5'7">5'7"</option>
    <option value="5'8">5'8"</option>
    <option value="5'9">5'9"</option>
    <option value="5'10">5'10"</option>
    <option value="5'11">5'11"</option>
    <option value="6'0">6'0"</option>
    <option value="6'1">6'1"</option>
    <option value="6'2">6'2"</option>
    <option value="6'3">6'3"</option>
    <option value="6'4">6'4"</option>
    <option value="6'5">6'5"</option>
    <option value="6'6">6'6"</option>
  </select>
</FieldRow>

   <FieldInput
  icon={Users}
  label="Mother Tongue"
  value={motherTongue}
  onChange={setMotherTongue}
  placeholder="e.g. Urdu, Arabic, English"
/>
   <FieldSelect
  icon={Heart}
  label="Marital Status"
  value={maritalStatus}
  onChange={setMaritalStatus}
>
  <option value="">Select</option>
  {MARITAL.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ))}
</FieldSelect>
          
  <div onClick={() => setCountryOpen(true)}>
  <FieldRow icon={Globe} label="Nationality">
    <button
      type="button"
      onClick={() => setCountryOpen(true)}
      className="text-sm text-right bg-transparent focus:outline-none flex items-center gap-1 text-slate-900"
    >
     {nationality || <span className="text-slate-400">Select nationality</span>}
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
  </FieldRow>
</div>

   <FieldInput
   icon={MapPin}
    label="City"
     value={city}
       onChange={setCity}
       placeholder="Enter city"
       />
          
       <FieldInput
         icon={GraduationCap}
         label="Education"
         value={education}
         onChange={setEducation}
        placeholder="e.g. Bachelor's"
         />
          
          <Dialog open={countryOpen} onOpenChange={setCountryOpen}>
            <DialogContent className="p-0 gap-0 overflow-hidden max-w-sm">
              <DialogTitle className="sr-only">Select Country</DialogTitle>
              <Command>
                <CommandInput placeholder="Search country…" />
                <CommandList className="max-h-[60vh]">
                  <CommandEmpty>No country found.</CommandEmpty>
                  {COUNTRIES.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        setNationality(c);
                        setCountryOpen(false);
                      }}
                    >
                      {c}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>

          <FieldInput
            icon={Briefcase}
            label="Profession"
            optional
            value={profession}
            onChange={setProfession}
            placeholder="e.g. Engineer"
          />
        
          <FieldInput
          icon={Briefcase}
          label="Company / Work"
          optional
          value={company}
          onChange={setCompany}
         placeholder="e.g. ABC Company"
         />
          <FieldInput
          icon={Briefcase}
        label="Income"
        optional
       value={income}
      onChange={setIncome}
    placeholder="e.g. 5000 SAR"
   />

  <FieldInput
    icon={MapPin}
     label="Living In"
    value={livingIn}
    onChange={setLivingIn}
   placeholder="Enter living location"
 />

<FieldInput
  icon={Users}
  label="Family Type"
  value={familyType}
  onChange={setFamilyType}
  placeholder="e.g. Nuclear"
/>

<FieldInput
  icon={Heart}
  label="Family Values"
  value={familyValues}
  onChange={setFamilyValues}
  placeholder="e.g. Traditional"
/>

<FieldInput
  icon={Users}
  label="Siblings"
  value={siblings}
  onChange={setSiblings}
  placeholder="e.g. 2 brothers, 1 sister"
/>

<FieldInput
  icon={MapPin}
  label="Family Location"
  value={familyLocation}
  onChange={setFamilyLocation}
  placeholder="e.g. Lahore, Pakistan"
/>

<FieldSelect
  icon={Moon}
  label="Smoking"
  value={smoking}
  onChange={setSmoking}
  options={["Non-smoker", "Occasionally", "Regularly"]}
/>

<FieldSelect
  icon={Heart}
  label="Drinking"
  value={drinking}
  onChange={setDrinking}
  options={["Never", "Occasionally", "Regularly"]}
/>

<FieldSelect
  icon={Heart}
  label="Diet"
  value={diet}
  onChange={setDiet}
  options={["Vegetarian", "Non-vegetarian", "Vegan", "Other"]}
/>

<FieldInput
  icon={Heart}
  label="Hobbies & Interests"
  value={hobbies}
  onChange={setHobbies}
  placeholder="e.g. Travel, Reading"
/>

 <FieldSelect
   icon={Moon}
   label="Religion"
   optional
   value={religion}
   onChange={setReligion}
>
  <option value="">Select</option>
  {RELIGIONS.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ))}
</FieldSelect>

 <div className="pt-4 pb-1 text-center">
  <h2 className="text-lg font-bold text-white">Partner Preferences</h2>
  <p className="text-sm text-white/70">
    What you are looking for in a partner
  </p>
 </div>
          
  <FieldSelect icon={Users} label="Gender" value={lookingFor} onChange={setLookingFor}>
  <option value="">Select</option>
  {LOOKING_FOR.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ))}
</FieldSelect>
          
<FieldInput
  icon={Calendar}
  label="Preferred Age"
  value={prefAge}
  onChange={setPrefAge}
  placeholder="e.g. 25-35"
/>
    <FieldInput
     icon={Users}
     label="Preferred Height"
     value={prefHeight}
     onChange={setPrefHeight}
    placeholder="e.g. 5'4 - 6'0"
  />
          
<FieldInput
  icon={GraduationCap}
  label="Preferred Education"
  value={prefEducation}
  onChange={setPrefEducation}
  placeholder="e.g. Bachelor's"
/>
          
<FieldInput
  icon={Briefcase}
  label="Preferred Profession"
  value={prefProfession}
  onChange={setPrefProfession}
  placeholder="e.g. Engineer"
/>

<FieldInput
  icon={Heart}
  label="Other Expectations"
  value={otherExpectations}
  onChange={setOtherExpectations}
placeholder="Any other expectations"
/>

 <FieldInput
  icon={Wallet}
  label="Income"
  value={prefIncome}
  onChange={setPrefIncome}
  placeholder="e.g. 5000 SAR"
/>

<FieldInput
  icon={Globe}
  label="Nationality"
  value={prefNationality}
  onChange={setPrefNationality}
  placeholder="Enter nationality"
/>

<FieldInput
  icon={MapPin}
  label="City"
  value={prefCity}
  onChange={setPrefCity}
  placeholder="Enter city"
/>
          <FieldSelect icon={Heart} label="Marital Status" value={maritalStatus} onChange={setMaritalStatus}>
            <option value="">Select</option>
            {MARITAL.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </FieldSelect>

          <FieldSelect icon={Moon} label="Religion" optional value={religion} onChange={setReligion}>
            <option value="">Select</option>
            {RELIGIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </FieldSelect>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full h-14 rounded-2xl bg-pink-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-pink-700"
        >
   {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
    Save Profile
        </button>
          <button
          type="button"
           onClick={deleteProfile}
           className="mt-3 w-full h-14 rounded-2xl bg-red-600 text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-red-700"
           >
            Delete Profile
            </button>
      </div>
      </div>
    </Layout>
  );
}

function FieldRow({
  icon: Icon,
  label,
  optional,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 h-11 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-semibold text-sm whitespace-nowrap shrink-0">
        {label}
        {optional && <span className="text-slate-400 font-normal"> (Optional)</span>}
      </span>
      <div className="flex-1 min-w-0 flex justify-end overflow-hidden">
     {children}
   </div>
    </div>
  );
}

function FieldInput({
  icon,
  label,
  optional,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <FieldRow icon={icon} label={label} optional={optional}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm text-right bg-transparent focus:outline-none w-full max-w-[180px] placeholder:text-slate-400"
      />
    </FieldRow>
  );
}

function FieldSelect({
  icon,
  label,
  optional,
  value,
  onChange,
  children,
  options,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  children?: React.ReactNode;
  options?: string[];
}) {
  return (
    <FieldRow icon={icon} label={label} optional={optional}>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm text-right bg-transparent focus:outline-none appearance-none pr-7 cursor-pointer"
        >
          {children ?? (
            <>
              <option value="">Select</option>
              {options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </>
          )}
        </select>

        <ChevronDown className="absolute right-0 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </FieldRow>
  );
}
