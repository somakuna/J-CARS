-- Boja vozila i slika modela (CarImages API, dohvaća se pri spremanju vozila).
begin;

alter table public.vehicles
  add column color text check (color in (
    'white', 'black', 'grey', 'silver', 'blue', 'red',
    'green', 'yellow', 'orange', 'brown', 'beige', 'other'
  )),
  add column image_path text check (length(image_path) <= 300);

comment on column public.vehicles.color is 'Boja vozila; za sliku API podržava white/black/grey/silver/blue/red, ostale daju originalnu boju modela.';
comment on column public.vehicles.image_path is 'Putanja slike modela u bucketu vehicle-images: {user_id}/{vehicle_id}/{oznaka}.webp';

-- Pogled koristi v.*, a stupci se fiksiraju pri izradi – zato se izrađuje ponovno.
drop view public.vehicle_overview;

create view public.vehicle_overview
with (security_invoker = true)
as
select
  v.*,
  greatest(v.registration_expiry, reg.max_expiry) as effective_registration_expiry,
  tire.tire_type                                  as current_tire_type,
  tire.tire_size                                  as current_tire_size,
  tire.activity_date                              as last_tire_change_date,
  greatest(v.current_mileage, km.max_mileage)     as effective_mileage,
  svc.activity_date                               as last_service_date,
  svc.mileage                                     as last_service_mileage,
  svc.service_type                                as last_service_type,
  svc.next_service_date,
  svc.next_service_mileage
from public.vehicles v
left join lateral (
  select max(a.registration_expiry) as max_expiry
  from public.activities a
  where a.vehicle_id = v.id and a.activity_type = 'registration'
) reg on true
left join lateral (
  select a.tire_type, a.tire_size, a.activity_date
  from public.activities a
  where a.vehicle_id = v.id and a.activity_type = 'tires'
  order by a.activity_date desc, a.created_at desc
  limit 1
) tire on true
left join lateral (
  select max(a.mileage) as max_mileage
  from public.activities a
  where a.vehicle_id = v.id
) km on true
left join lateral (
  select a.activity_date, a.mileage, a.service_type, a.next_service_date, a.next_service_mileage
  from public.activities a
  where a.vehicle_id = v.id and a.activity_type = 'service'
  order by a.activity_date desc, a.created_at desc
  limit 1
) svc on true;

comment on view public.vehicle_overview is 'Vozila s izvedenim podacima: stvarni istek registracije, gume, kilometraža, zadnji i sljedeći servis.';

revoke all on public.vehicle_overview from anon, authenticated;
grant select on public.vehicle_overview to authenticated;

-- Slike modela: javno čitljive (katalog slika automobila, bez osobnih podataka),
-- a dodavati i brisati može samo vlasnik u svojoj mapi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-images', 'vehicle-images', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "vehicle-images: vlasnik čita" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vehicle-images: vlasnik dodaje" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vehicle-images: vlasnik briše" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
