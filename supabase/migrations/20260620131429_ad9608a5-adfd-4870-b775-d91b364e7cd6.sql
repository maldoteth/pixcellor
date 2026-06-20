
CREATE TABLE public.personal_schedule_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME NULL,
  finish_time TIME NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personal_events_user_date ON public.personal_schedule_events(user_id, event_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_schedule_events TO authenticated;
GRANT ALL ON public.personal_schedule_events TO service_role;

ALTER TABLE public.personal_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own personal events"
  ON public.personal_schedule_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_personal_events_updated_at
  BEFORE UPDATE ON public.personal_schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
