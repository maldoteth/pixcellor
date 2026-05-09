create or replace function public.portal_create_manual_order(
  _customer_email text,
  _customer_name text default null,
  _package_name text default 'Full Works',
  _amount_pence bigint default 0,
  _mark_paid boolean default true,
  _notes text default null,
  _custom_label text default null,
  _billing text default 'one-time'
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  clean_email text := lower(nullif(trim(coalesce(_customer_email, '')), ''));
  clean_name text := nullif(trim(coalesce(_customer_name, '')), '');
  clean_package text := nullif(trim(coalesce(_package_name, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
  clean_label text := nullif(trim(coalesce(_custom_label, '')), '');
  clean_billing text := lower(nullif(trim(coalesce(_billing, 'one-time')), ''));
  admin_email text;
  new_session_id text;
  new_row public.stripe_checkout_sessions%rowtype;
  meta jsonb;
begin
  perform public.portal_require_admin();

  if clean_email is null or length(clean_email) > 255 or clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid customer email';
  end if;
  if _amount_pence is null or _amount_pence < 1 or _amount_pence > 100000000 then
    raise exception 'Amount must be between £0.01 and £1,000,000';
  end if;
  if clean_package is null or length(clean_package) > 80 then
    raise exception 'Package name is required (max 80 chars)';
  end if;
  if clean_label is not null and length(clean_label) > 80 then
    raise exception 'Custom label must be 80 characters or fewer';
  end if;
  if clean_notes is not null and length(clean_notes) > 1000 then
    raise exception 'Notes must be 1000 characters or fewer';
  end if;
  if clean_name is not null and length(clean_name) > 100 then
    raise exception 'Customer name must be 100 characters or fewer';
  end if;

  select lower(email) into admin_email from auth.users where id = auth.uid() limit 1;

  new_session_id := 'manual_' || replace(gen_random_uuid()::text, '-', '');

  meta := jsonb_build_object(
    'source', 'admin_manual',
    'package_name', clean_package,
    'billing', coalesce(clean_billing, 'one-time'),
    'created_by_email', admin_email,
    'buyer_email', clean_email,
    'buyer_name', clean_name,
    'custom_label', clean_label,
    'admin_notes', clean_notes
  );

  insert into public.stripe_checkout_sessions (
    session_id,
    stripe_event_id,
    mode,
    payment_status,
    status,
    amount_total,
    currency,
    customer_email,
    capture_status,
    captured_at,
    order_status,
    metadata
  ) values (
    new_session_id,
    new_session_id,
    'payment',
    case when _mark_paid then 'paid' else 'unpaid' end,
    case when _mark_paid then 'complete' else 'open' end,
    _amount_pence,
    'gbp',
    clean_email,
    case when _mark_paid then 'manual' else null end,
    case when _mark_paid then now() else null end,
    'open',
    meta
  ) returning * into new_row;

  perform public.ensure_order_public_reference(new_session_id);

  select * into new_row from public.stripe_checkout_sessions where session_id = new_session_id;
  return to_jsonb(new_row);
end;
$$;

create or replace function public.match_manual_order_to_stripe(_real_session_id text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  stripe_row public.stripe_checkout_sessions%rowtype;
  manual_id text;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role)) then
    raise exception 'Not authorised' using errcode = '28000';
  end if;

  select * into stripe_row from public.stripe_checkout_sessions where session_id = _real_session_id;
  if not found then return null; end if;
  if stripe_row.payment_status <> 'paid' then return null; end if;
  if coalesce(stripe_row.metadata->>'source', '') = 'admin_manual' then return null; end if;
  if stripe_row.customer_email is null or stripe_row.amount_total is null then return null; end if;

  select session_id into manual_id
  from public.stripe_checkout_sessions
  where metadata->>'source' = 'admin_manual'
    and lower(coalesce(customer_email, '')) = lower(stripe_row.customer_email)
    and amount_total = stripe_row.amount_total
    and coalesce(payment_status, '') <> 'paid'
  order by created_at asc
  limit 1;

  if manual_id is null then return null; end if;

  update public.stripe_checkout_sessions
  set payment_status = 'paid',
      status = 'complete',
      payment_intent_id = coalesce(payment_intent_id, stripe_row.payment_intent_id),
      customer_id = coalesce(customer_id, stripe_row.customer_id),
      capture_status = coalesce(capture_status, stripe_row.capture_status, 'captured'),
      captured_at = coalesce(captured_at, stripe_row.captured_at, now()),
      metadata = coalesce(metadata, '{}'::jsonb)
                 || jsonb_build_object('matched_stripe_session', _real_session_id),
      updated_at = now()
  where session_id = manual_id;

  update public.stripe_checkout_sessions
  set order_status = 'merged_to_manual',
      metadata = coalesce(metadata, '{}'::jsonb)
                 || jsonb_build_object('merged_into_manual', manual_id),
      updated_at = now()
  where session_id = _real_session_id;

  return manual_id;
end;
$$;