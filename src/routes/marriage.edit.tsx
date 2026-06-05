import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Calendar, Users, MapPin, Briefcase, Heart, Moon, FileText, Save, Loader2, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/marriage/edit")({
  component: MarriageEditPage,
});

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
  const [lookingFor, setLookingFor] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [profession, setProfession] = useState<string>("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [religion, setReligion] = useState<string>("");
  const [about, setAbout] = useState<string>("");

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
        setLookingFor(mp.looking_for ?? "");
        setCountry(mp.country ?? "");
        setProfession(mp.profession ?? "");
        setMaritalStatus(mp.marital_status ?? "");
        setReligion(mp.religion ?? "");
        setAbout(mp.about ?? "");
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
          looking_for: lookingFor || null,
          country: country.trim() || null,
          profession: profession.trim() || null,
          marital_status: maritalStatus || null,
          religion: religion || null,
          about: about.trim() || null,
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
          <h1 className="text-xl font-extrabold flex-1 text-center">Marriage Profile</h1>
          <button
            onClick={save}
            disabled={saving}
            className="text-pink-600 font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-full object-cover ring-4 ring-pink-100" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 ring-4 ring-pink-100 flex items-center justify-center text-white text-3xl font-bold">
              {(displayName || "U")[0]?.toUpperCase()}
            </div>
          )}
          <p className="mt-3 font-semibold">{displayName || "Your profile"}</p>
          <p className="text-xs text-slate-500">Using your account profile photo</p>
        </div>

        <div className="space-y-3">
          <FieldSelect icon={Calendar} label="Age" value={age} onChange={setAge}>
            <option value="">Select age</option>
            {Array.from({ length: 82 }, (_, i) => 18 + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </FieldSelect>

          <FieldSelect icon={Users} label="Looking For" value={lookingFor} onChange={setLookingFor}>
            <option value="">Select</option>
            {LOOKING_FOR.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </FieldSelect>

          <div onClick={() => setCountryOpen(true)}>
            <FieldRow icon={MapPin} label="Country">
              <button
                type="button"
                onClick={() => setCountryOpen(true)}
                className="text-sm text-right bg-transparent focus:outline-none flex items-center gap-1 text-slate-900"
              >
                {country || <span className="text-slate-400">Select country</span>}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </FieldRow>
          </div>

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
                        setCountry(c);
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

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </span>
              <span className="font-semibold">About Me</span>
            </div>
            <textarea
              value={about}
              maxLength={500}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="Write something about yourself…"
              className="w-full resize-none text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
            />
            <div className="text-right text-xs text-slate-400">{about.length}/500</div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full h-14 rounded-2xl bg-pink-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-pink-700"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save Profile
        </button>
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
    <div className="bg-white border border-slate-200 rounded-2xl px-4 h-14 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-semibold text-sm">
        {label}
        {optional && <span className="text-slate-400 font-normal"> (Optional)</span>}
      </span>
      <div className="flex-1 flex justify-end">{children}</div>
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
        className="text-sm text-right bg-transparent focus:outline-none w-40 placeholder:text-slate-400"
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <FieldRow icon={icon} label={label} optional={optional}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm text-right bg-transparent focus:outline-none appearance-none pr-1"
      >
        {children}
      </select>
    </FieldRow>
  );
}
