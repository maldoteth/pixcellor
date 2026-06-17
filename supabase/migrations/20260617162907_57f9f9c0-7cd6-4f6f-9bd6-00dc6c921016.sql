-- Public RPC to list open vacancies with filters (no auth required)
CREATE OR REPLACE FUNCTION public.public_open_vacancies(
  _search text DEFAULT NULL,
  _location text DEFAULT NULL,
  _arrangement text DEFAULT NULL,
  _employment_type text DEFAULT NULL,
  _min_pay numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  location text,
  arrangement text,
  employment_type text,
  start_date date,
  end_date date,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  pay_period text,
  openings smallint,
  required_skills text[],
  description text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.title, v.location,
         v.arrangement::text, v.employment_type::text,
         v.start_date, v.end_date,
         v.pay_min, v.pay_max, v.pay_currency, v.pay_period,
         v.openings, v.required_skills, v.description, v.created_at
  FROM public.vacancies v
  WHERE v.status = 'open'
    AND (_search IS NULL OR _search = '' OR
         v.title ILIKE '%'||_search||'%' OR
         v.description ILIKE '%'||_search||'%' OR
         v.location ILIKE '%'||_search||'%' OR
         EXISTS (SELECT 1 FROM unnest(coalesce(v.required_skills, ARRAY[]::text[])) s WHERE s ILIKE '%'||_search||'%'))
    AND (_location IS NULL OR _location = '' OR v.location ILIKE '%'||_location||'%')
    AND (_arrangement IS NULL OR _arrangement = '' OR v.arrangement::text = _arrangement)
    AND (_employment_type IS NULL OR _employment_type = '' OR v.employment_type::text = _employment_type)
    AND (_min_pay IS NULL OR coalesce(v.pay_max, v.pay_min, 0) >= _min_pay)
  ORDER BY v.created_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.public_open_vacancies(text, text, text, text, numeric) TO anon, authenticated;

-- Single vacancy details (public)
CREATE OR REPLACE FUNCTION public.public_vacancy_detail(_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  location text,
  arrangement text,
  employment_type text,
  start_date date,
  end_date date,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  pay_period text,
  openings smallint,
  required_skills text[],
  qualifications text[],
  certifications text[],
  description text,
  benefits text,
  hours_per_week numeric,
  duration_weeks integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.title, v.location,
         v.arrangement::text, v.employment_type::text,
         v.start_date, v.end_date,
         v.pay_min, v.pay_max, v.pay_currency, v.pay_period,
         v.openings, v.required_skills, v.qualifications, v.certifications,
         v.description, v.benefits, v.hours_per_week, v.duration_weeks, v.created_at
  FROM public.vacancies v
  WHERE v.id = _id AND v.status = 'open'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_vacancy_detail(uuid) TO anon, authenticated;