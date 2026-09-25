ALTER TABLE public.marriage_profiles
  ADD COLUMN IF NOT EXISTS pref_living_in text,
  ADD COLUMN IF NOT EXISTS pref_nationality text,
  ADD COLUMN IF NOT EXISTS pref_education_2 text,
  ADD COLUMN IF NOT EXISTS pref_income text,
  ADD COLUMN IF NOT EXISTS pref_city text,
  ADD COLUMN IF NOT EXISTS pref_marital_status text;