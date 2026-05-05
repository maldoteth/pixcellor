CREATE TABLE public.lets_talk_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT lets_talk_leads_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE public.lets_talk_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit lets talk leads"
ON public.lets_talk_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins read lets talk leads"
ON public.lets_talk_leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));