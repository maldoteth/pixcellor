REVOKE EXECUTE ON FUNCTION public.portal_create_candidate(text,text,text,text,text,text,integer,text,text,integer,date,integer,integer,text,public.candidate_work_type,public.candidate_arrangement,public.candidate_right_to_work,text[],text[],text[],text,text,text,text,text[],public.candidate_source,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_update_candidate(uuid,jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_update_candidate_status(uuid,public.candidate_status,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_create_candidate_event(uuid,text,text,text,timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_complete_candidate_callback(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_add_candidate_document(uuid,text,text,text,bigint,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portal_match_candidates_for_contact(uuid,int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_candidate_from_intake(jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_candidate_from_intake(jsonb) TO service_role;