import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Layout } from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Calendar, Users, MapPin, Briefcase, Heart, Moon, FileText, Save, Loader2, Search, ChevronDown, Globe, GraduationCap, Wallet, CircleDollarSign } from "lucide-react";
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
          className="text-sm text-right text-white flex items-center gap-1"
        >
          {selectedDate ? (
            format(selectedDate, "dd MMM yyyy")
          ) : (
            <span className="text-white/40">Select date</span>
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
  const [prefReligion, setPrefReligion] = useState<string>("");
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
 setPrefReligion(mp.pref_religion ?? "");
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
          pref_religion: prefReligion.trim() || null,
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
          <Link to="/marriage" className="h-10 w-10 rounded-full bg-[#005A35] border border-[#19D66B] flex items-center justify-center shadow-sm">
            <ArrowLeft className="h-5 w-5 text-white" />
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
           <div className="bg-[#005A35] border border-[#19D66B] rounded-2xl p-4">
  <div className="flex items-center gap-3 mb-2">
    <span className="h-9 w-9 rounded-xl bg-[#003D25] text-[#7CFF3B] border border-[#19D66B]/60 flex items-center justify-center">
      <FileText className="h-5 w-5" />
    </span>
    <span className="font-semibold text-white">About Me</span>
  </div>

  <textarea
    value={about}
    maxLength={100}
    onChange={(e) => setAbout(e.target.value)}
    rows={4}
    placeholder="Write something about yourself…"
    className="w-full resize-none text-sm text-white bg-transparent focus:outline-none placeholder:text-white/40"
  />

  <div className="text-right text-xs text-white/45">
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

<FieldSelect
  icon={Users}
  label="Height"
  value={height}
  onChange={setHeight}
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
</FieldSelect>
          
   <FieldSelect
  icon={Users}
  label="Mother Tongue"
  value={motherTongue}
  onChange={setMotherTongue}
>
  <option value="">Select language</option>
  <option value="Urdu">Urdu</option>
  <option value="Arabic">Arabic</option>
  <option value="English">English</option>
  <option value="Punjabi">Punjabi</option>
  <option value="Hindi">Hindi</option>
  <option value="Bengali">Bengali</option>
  <option value="Tamil">Tamil</option>
  <option value="Telugu">Telugu</option>
  <option value="Malayalam">Malayalam</option>
  <option value="Other">Other</option>
</FieldSelect>
          
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
      className="w-full max-w-[180px] h-9 rounded-lg bg-[#003D25] border border-[#19D66B]/60 px-3 text-sm text-white text-left focus:outline-none flex items-center justify-between gap-2"
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
          
       <FieldSelect
        icon={GraduationCap}
        label="Education"
        value={education}
        onChange={setEducation}
        >
       <option value="">Select education</option>
      <option value="High School">High School</option>
      <option value="Diploma">Diploma</option>
      <option value="Bachelor's">Bachelor's</option>
      <option value="Master's">Master's</option>
      <option value="PhD">PhD</option>
       <option value="Other">Other</option>
       </FieldSelect>
          
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

          <FieldSelect
        icon={Briefcase}
     label="Profession"
    optional
  value={profession}
  onChange={setProfession}
>
  <option value="">Select profession</option>
  <option value="Engineer">Engineer</option>
  <option value="Doctor">Doctor</option>
  <option value="Teacher">Teacher</option>
  <option value="Business">Business</option>
  <option value="Government Employee">Government Employee</option>
  <option value="Private Employee">Private Employee</option>
    <option value="IT Professional">IT Professional</option>
     <option value="Accountant">Accountant</option>
      <option value="Lawyer">Lawyer</option>
       <option value="Other">Other</option>
         </FieldSelect>
        
          <FieldInput
          icon={Briefcase}
          label="Company / Work"
          optional
          value={company}
          onChange={setCompany}
         placeholder="e.g. ABC Company"
         />
        <FieldRow icon={CircleDollarSign} label="Income">
       <div className="flex gap-2">
      <input
        value={income.split(" ")[0] || ""}
        onChange={(e) => {
          const currency = income.split(" ")[1] || "SAR";
          setIncome(`${e.target.value} ${currency}`);
        }}
        placeholder="Amount"
        className="w-[70px] h-9 rounded-lg bg-[#003D25] border border-[#19D66B]/60 pl-4 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
      />

      <select
        value={income.split(" ")[1] || "SAR"}
        onChange={(e) => {
          const amount = income.split(" ")[0] || "";
          setIncome(`${amount} ${e.target.value}`);
        }}
        className="w-20 h-9 rounded-lg bg-[#003D25] border border-[#19D66B]/60 px-2 text-sm text-white focus:outline-none"
      >
        <option value="SAR">SAR</option>
        <option value="PKR">PKR</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="AED">AED</option>
        <option value="INR">INR</option>
        <option value="BDT">BDT</option>
        <option value="CNY">CNY</option>
        <option value="JPY">JPY</option>
        <option value="CAD">CAD</option>
        <option value="AUD">AUD</option>
        <option value="Other">Other</option>
      </select>
    </div>
</FieldRow>

  <FieldInput
    icon={MapPin}
     label="Living In"
    value={livingIn}
    onChange={setLivingIn}
   placeholder="Enter living location"
 />

<FieldSelect
  icon={Users}
  label="Family Type"
  value={familyType}
  onChange={setFamilyType}
>
  <option value="">Select family type</option>
  <option value="Nuclear">Nuclear</option>
  <option value="Joint">Joint</option>
  <option value="Extended">Extended</option>
  <option value="Other">Other</option>
</FieldSelect>

<FieldSelect
  icon={Heart}
  label="Family Values"
  value={familyValues}
  onChange={setFamilyValues}
>
  <option value="">Select family values</option>
  <option value="Traditional">Traditional</option>
  <option value="Moderate">Moderate</option>
  <option value="Liberal">Liberal</option>
  <option value="Other">Other</option>
</FieldSelect>

<FieldSelect
  icon={Users}
  label="Siblings"
  value={siblings}
  onChange={setSiblings}
>
  <option value="">Select</option>
  <option value="None">None</option>
  <option value="1">1</option>
  <option value="2">2</option>
  <option value="3">3</option>
  <option value="4">4</option>
  <option value="5+">5+</option>
</FieldSelect>

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
          
<FieldSelect
  icon={Calendar}
  label="Preferred Age"
  value={prefAge}
  onChange={setPrefAge}
>
  <option value="">Select age</option>
  <option value="18-25">18-25</option>
  <option value="25-30">25-30</option>
  <option value="30-35">30-35</option>
  <option value="35-40">35-40</option>
  <option value="40-50">40-50</option>
  <option value="50+">50+</option>
</FieldSelect>
          
    <FieldSelect
  icon={Users}
  label="Preferred Height"
  value={prefHeight}
  onChange={setPrefHeight}
>
  <option value="">Select height</option>
  <option value="4'10 - 5'0">4'10" - 5'0"</option>
  <option value="5'0 - 5'4">5'0" - 5'4"</option>
  <option value="5'4 - 5'8">5'4" - 5'8"</option>
  <option value="5'8 - 6'0">5'8" - 6'0"</option>
  <option value="6'0+">6'0"+</option>
</FieldSelect>
          
<FieldSelect
  icon={GraduationCap}
  label="Preferred Education"
  value={prefEducation}
  onChange={setPrefEducation}
>
  <option value="">Select education</option>
  <option value="High School">High School</option>
  <option value="Diploma">Diploma</option>
  <option value="Bachelor's">Bachelor's</option>
  <option value="Master's">Master's</option>
  <option value="PhD">PhD</option>
</FieldSelect>
          
<FieldSelect
  icon={Briefcase}
  label="Preferred Profession"
  value={prefProfession}
  onChange={setPrefProfession}
>
  <option value="">Select profession</option>
  <option value="Engineer">Engineer</option>
  <option value="Doctor">Doctor</option>
  <option value="Teacher">Teacher</option>
  <option value="Business">Business</option>
  <option value="Government Employee">Government Employee</option>
  <option value="Private Employee">Private Employee</option>
  <option value="IT Professional">IT Professional</option>
  <option value="Accountant">Accountant</option>
  <option value="Lawyer">Lawyer</option>
  <option value="Other">Other</option>
</FieldSelect>

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

<FieldSelect
  icon={Globe}
  label="Nationality"
  value={prefNationality}
  onChange={setPrefNationality}
>
  <option value="">Select nationality</option>
  {COUNTRIES.map((country) => (
    <option key={country} value={country}>
      {country}
    </option>
  ))}
</FieldSelect>

<FieldInput
  icon={MapPin}
  label="City"
  value={prefCity}
  onChange={setPrefCity}
  placeholder="Enter city"
/>
          <FieldSelect icon={Heart} label="Marital Status" value={prefMaritalStatus} onChange={setPrefMaritalStatus}>
            <option value="">Select</option>
            {MARITAL.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </FieldSelect>

          <FieldSelect icon={Moon} label="Religion" optional value={prefReligion} onChange={setPrefReligion}>
            <option value="">Select</option>
            {RELIGIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </FieldSelect>

          <div className="mt-4 flex gap-3">
  <button
    onClick={save}
    disabled={saving}
    className="flex-1 h-11 rounded-xl bg-[#19D66B] text-[#003D25] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#7CFF3B]"
  >
      {saving ? (
       <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
      <Save className="h-5 w-5" />
      )}
      Save Profile
  </button>

  <button
      type="button"
       onClick={deleteProfile}
       className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-red-700"
      >
        Delete Profile
       </button>
       </div>
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
    <div className="bg-[#005A35] border border-[#19D66B] rounded-2xl px-4 h-11 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-[#003D25] text-[#7CFF3B] border border-[#19D66B]/60 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-semibold text-sm text-white whitespace-nowrap shrink-0">
        {label}
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
        className="text-sm text-right text-white bg-transparent focus:outline-none w-full max-w-[180px] placeholder:text-white/40"
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
      <div className="relative flex items-center w-full max-w-[180px]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-lg bg-[#003D25] border border-[#19D66B]/60 px-3 pr-8 text-sm text-white text-left focus:outline-none appearance-none cursor-pointer"
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

        <ChevronDown className="absolute right-3 h-4 w-4 text-[#7CFF3B] pointer-events-none" />
      </div>
    </FieldRow>
  );
}
