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

  -- Seed a placeholder stripe_events row to satisfy the FK on stripe_checkout_sessions.stripe_event_id
  insert into public.stripe_events (stripe_event_id, event_type, payload, checkout_session_id)
  values (new_session_id, 'manual.order.created', meta, new_session_id)
  on conflict (stripe_event_id) do nothing;

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

-- RPC for the New Order dialog autocomplete
create or replace function public.portal_search_customers(_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  needle text := lower(trim(coalesce(_q, '')));
  result jsonb;
begin
  perform public.portal_require_admin();
  if length(needle) < 1 then
    return '[]'::jsonb;
  end if;

  with combined as (
    -- existing buyers
    select distinct on (lower(coalesce(customer_email, '')))
      lower(customer_email) as email,
      coalesce(metadata->>'buyer_name', '') as name,
      'order' as source
    from public.stripe_checkout_sessions
    where customer_email is not null
      and (lower(customer_email) like needle || '%'
           or lower(coalesce(metadata->>'buyer_name', '')) like '%' || needle || '%')
    union
    -- contacts (CRM)
    select distinct on (lower(coalesce(email, '')))
      lower(email) as email,
      coalesce(contact_name, name, '') as name,
      'contact' as source
    from public.contacts
    where email is not null
      and (lower(email) like needle || '%'
           or lower(coalesce(name, '')) like '%' || needle || '%'
           or lower(coalesce(contact_name, '')) like '%' || needle || '%')
    union
    -- client profiles (enquiries)
    select distinct on (lower(coalesce(email, '')))
      lower(email) as email,
      coalesce(name, '') as name,
      'profile' as source
    from public.client_profiles
    where email is not null
      and (lower(email) like needle || '%'
           or lower(coalesce(name, '')) like '%' || needle || '%')
  )
  select coalesce(jsonb_agg(jsonb_build_object('email', email, 'name', name, 'source', source) order by email), '[]'::jsonb)
  into result
  from (
    select distinct on (email) email, name, source from combined
    where email is not null and email <> ''
    order by email, source
    limit 8
  ) c;

  return result;
end;
$$;

grant execute on function public.portal_search_customers(text) to authenticated;