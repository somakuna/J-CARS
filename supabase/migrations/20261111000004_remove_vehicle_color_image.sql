-- Poništava 20261111000003: boja i slika vozila (CarImages API) ipak nisu potrebne
-- (besplatni plan stavlja vodeni žig; odluka korisnika 11.11.2026.).
-- Bucket „vehicle-images” briše se u Dashboardu (Storage) – datoteke se ne smiju brisati SQL-om.
begin;

drop view public.vehicle_overview;

alter table public.vehicles
  drop column if exists color,
  drop column if exists image_path;

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

drop policy if exists "vehicle-images: vlasnik čita" on storage.objects;
drop policy if exists "vehicle-images: vlasnik dodaje" on storage.objects;
drop policy if exists "vehicle-images: vlasnik briše" on storage.objects;

commit;
