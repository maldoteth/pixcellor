ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'general';

UPDATE public.contacts
SET industry = CASE
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '') || ' ' || coalesce(source, '')) ~ '(electrician|electrical|roofer|roofing|plumber|plumbing|builder|building|construction|carpenter|joiner|decorator|painter|landscap|driveway|window|glazing|heating|gas engineer|tiler|flooring|brick|scaffold|bathroom|kitchen fitter)' THEN 'construction'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(restaurant|cafe|bar|pub|hotel|catering|takeaway|hospitality|food)' THEN 'hospitality'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(salon|barber|beauty|spa|aesthetic|nail|hair)' THEN 'beauty'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(gym|fitness|personal trainer|physio|clinic|health|dentist|medical)' THEN 'healthcare'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(estate agent|property|letting|mortgage|real estate)' THEN 'property'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(accountant|solicitor|lawyer|consultant|finance|insurance)' THEN 'professional services'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(shop|retail|boutique|ecommerce|e-commerce|store)' THEN 'retail'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(mechanic|garage|mot|vehicle|car dealer|automotive)' THEN 'automotive'
  ELSE 'general'
END
WHERE industry = 'general';

NOTIFY pgrst, 'reload schema';
