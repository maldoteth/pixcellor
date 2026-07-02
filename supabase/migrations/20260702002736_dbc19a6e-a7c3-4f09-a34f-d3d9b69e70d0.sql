
CREATE OR REPLACE FUNCTION public.increment_send_opens(_send_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.client_campaign_sends SET open_count = open_count + 1 WHERE id = _send_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_stat(_campaign_id UUID, _field TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _field NOT IN ('total_sent','total_delivered','total_opened','total_clicked','total_bounced','total_unsubscribed') THEN
    RAISE EXCEPTION 'invalid stat %', _field;
  END IF;
  EXECUTE format('UPDATE public.client_campaigns SET %I = %I + 1 WHERE id = $1', _field, _field) USING _campaign_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_send_opens(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_campaign_stat(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_send_opens(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(UUID, TEXT) TO service_role;
