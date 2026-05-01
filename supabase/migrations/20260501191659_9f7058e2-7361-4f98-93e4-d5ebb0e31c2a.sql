
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do nothing;

create policy "Email assets are publicly readable"
on storage.objects for select
using (bucket_id = 'email-assets');

create policy "Admins can upload email assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can update email assets"
on storage.objects for update
to authenticated
using (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete email assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'::public.app_role));
