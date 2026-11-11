-- =============================================================================
-- J-CARS – početna shema baze
--   tablice: vehicles, activities, settings, push_subscriptions, notification_logs
--   pogled:  vehicle_overview (izvedeni podaci vozila iz aktivnosti)
--   storage: privatni bucket "attachments"
--   RLS:     svaki red pripada korisniku (user_id = auth.uid())
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pomoćne funkcije
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Registracijska oznaka: velika slova, bez suvišnih razmaka ("zg  1234-ab " → "ZG 1234-AB").
create or replace function public.normalize_registration_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.registration_number = upper(btrim(regexp_replace(new.registration_number, '\s+', ' ', 'g')));
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------

create table public.vehicles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  make                text not null check (length(btrim(make)) between 1 and 60),
  model               text not null check (length(btrim(model)) between 1 and 60),
  registration_number text not null check (length(btrim(registration_number)) between 2 and 20),
  year                smallint check (year between 1950 and 2100),
  current_mileage     integer check (current_mileage >= 0),
  -- Datum unesen uz vozilo. Stvarni istek (uključujući aktivnosti registracije)
  -- daje pogled vehicle_overview.effective_registration_expiry.
  registration_expiry date not null,
  responsible_person  text check (length(responsible_person) <= 100),
  note                text check (length(note) <= 2000),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.vehicles is 'Službena vozila.';
comment on column public.vehicles.registration_expiry is 'Istek registracije unesen uz vozilo; aktivnosti registracije ga mogu produljiti (vidi vehicle_overview).';
comment on column public.vehicles.current_mileage is 'Ručno unesena kilometraža; stvarnu daje vehicle_overview.effective_mileage.';

-- Ista oznaka ne smije postojati dvaput (zanemaruju se razmaci i crtice).
create unique index vehicles_registration_number_unique
  on public.vehicles (user_id, (regexp_replace(registration_number, '[\s-]', '', 'g')));
create index vehicles_user_id_idx on public.vehicles (user_id);
create index vehicles_registration_expiry_idx on public.vehicles (registration_expiry);

create trigger vehicles_normalize_registration
  before insert or update of registration_number on public.vehicles
  for each row execute function public.normalize_registration_number();

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- activities
-- -----------------------------------------------------------------------------

create table public.activities (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id           uuid not null references public.vehicles (id) on delete cascade,
  activity_type        text not null check (activity_type in ('registration', 'tires', 'service', 'other')),
  title                text check (length(title) <= 120),
  description          text check (length(description) <= 4000),
  activity_date        date not null,
  mileage              integer check (mileage >= 0),
  registration_expiry  date,
  tire_type            text check (tire_type in ('summer', 'winter', 'all_season')),
  tire_size            text check (length(tire_size) <= 40),
  service_type         text check (service_type in ('minor', 'major', 'repair', 'other')),
  next_service_date    date,
  next_service_mileage integer check (next_service_mileage >= 0),
  reminder_enabled     boolean not null default false,
  attachment_path      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Registracija: obavezan datum isteka, nakon datuma registracije.
  constraint activities_registration_fields check (
    case when activity_type = 'registration'
      then registration_expiry is not null and registration_expiry > activity_date
      else registration_expiry is null
    end
  ),
  -- Gume: obavezna vrsta; polja guma samo kod promjene guma.
  constraint activities_tires_fields check (
    case when activity_type = 'tires'
      then tire_type is not null
      else tire_type is null and tire_size is null
    end
  ),
  -- Servis: obavezna vrsta i kilometraža; sljedeći servis samo kod servisa.
  constraint activities_service_fields check (
    case when activity_type = 'service'
      then service_type is not null and mileage is not null
           and (next_service_date is null or next_service_date > activity_date)
           and (next_service_mileage is null or next_service_mileage > mileage)
      else service_type is null and next_service_date is null and next_service_mileage is null
    end
  ),
  -- Ostalo: obavezan naslov; podsjetnik postoji samo za ovu vrstu.
  constraint activities_other_fields check (
    case when activity_type = 'other'
      then title is not null and length(btrim(title)) > 0
      else reminder_enabled = false
    end
  )
);

comment on table public.activities is 'Povijest svih aktivnosti vozila: registracije, gume, servisi, ostalo.';

create index activities_vehicle_history_idx on public.activities (vehicle_id, activity_date desc, created_at desc);
create index activities_vehicle_type_idx on public.activities (vehicle_id, activity_type, activity_date desc, created_at desc);
create index activities_user_date_idx on public.activities (user_id, activity_date desc);
create index activities_next_service_idx on public.activities (next_service_date) where next_service_date is not null;

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- vehicle_overview – izvedeni podaci, uvijek usklađeni s aktivnostima.
-- Brisanje ili ispravak aktivnosti automatski mijenja prikaz vozila.
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- settings – jedan red po korisniku
-- -----------------------------------------------------------------------------

create table public.settings (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  email_address               text check (email_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_notifications_enabled boolean not null default true,
  push_notifications_enabled  boolean not null default false,
  reminder_30_days            boolean not null default true,
  reminder_14_days            boolean not null default true,
  reminder_7_days             boolean not null default true,
  reminder_1_day              boolean not null default true,
  reminder_on_expiry          boolean not null default true,
  theme                       text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.settings is 'Postavke aplikacije i obavijesti (jedan red po korisniku).';

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Novi korisnik automatski dobiva red postavki s početnim vrijednostima.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id, email_address)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Korisnici stvoreni prije ove migracije.
insert into public.settings (user_id, email_address)
select id, email from auth.users
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- push_subscriptions
-- -----------------------------------------------------------------------------

create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint        text not null unique check (endpoint like 'https://%'),
  p256dh          text not null,
  auth            text not null,
  device_info     text check (length(device_info) <= 300),
  last_success_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Web Push pretplate uređaja. Nevažeće (404/410) briše serverski zadatak.';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notification_logs – piše ih samo server (service role)
-- -----------------------------------------------------------------------------

create table public.notification_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  vehicle_id        uuid references public.vehicles (id) on delete cascade,
  activity_id       uuid references public.activities (id) on delete cascade,
  deadline_type     text not null check (deadline_type in ('registration', 'service', 'activity', 'test')),
  deadline_date     date,
  reminder_interval smallint check (reminder_interval in (30, 14, 7, 1, 0)),
  notification_type text not null check (notification_type in ('email', 'push')),
  recipient         text,
  sent_at           timestamptz not null default now(),
  status            text not null check (status in ('sent', 'failed', 'skipped')),
  error_message     text,

  constraint notification_logs_deadline_fields check (
    deadline_type = 'test'
    or (vehicle_id is not null and deadline_date is not null and reminder_interval is not null)
  )
);

comment on table public.notification_logs is 'Evidencija poslanih obavijesti; sprječava dvostruko slanje.';

-- Ista obavijest za isti rok, interval i kanal smije biti uspješno poslana samo jednom.
create unique index notification_logs_dedupe_idx
  on public.notification_logs (
    vehicle_id,
    deadline_type,
    coalesce(activity_id, '00000000-0000-0000-0000-000000000000'::uuid),
    deadline_date,
    reminder_interval,
    notification_type
  )
  where status = 'sent' and deadline_type <> 'test';

create index notification_logs_user_sent_idx on public.notification_logs (user_id, sent_at desc);

-- -----------------------------------------------------------------------------
-- Prava pristupa i Row Level Security
-- -----------------------------------------------------------------------------

alter table public.vehicles           enable row level security;
alter table public.activities         enable row level security;
alter table public.settings           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs  enable row level security;

-- Supabase zadano daje sva prava rolama anon i authenticated.
-- Neprijavljeni nemaju nikakav pristup, a prijavljeni samo ono što aplikacija treba.
revoke all on public.vehicles, public.activities, public.settings,
              public.push_subscriptions, public.notification_logs, public.vehicle_overview
  from anon, authenticated;

grant select, insert, update, delete on public.vehicles, public.activities, public.push_subscriptions to authenticated;
grant select, update on public.settings to authenticated;
grant select on public.notification_logs, public.vehicle_overview to authenticated;

-- vehicles
create policy "vehicles: vlasnik čita"    on public.vehicles for select to authenticated using ((select auth.uid()) = user_id);
create policy "vehicles: vlasnik dodaje"  on public.vehicles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vehicles: vlasnik mijenja" on public.vehicles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vehicles: vlasnik briše"   on public.vehicles for delete to authenticated using ((select auth.uid()) = user_id);

-- activities – vozilo mora pripadati istom korisniku
create policy "activities: vlasnik čita" on public.activities for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "activities: vlasnik dodaje" on public.activities for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
  );
create policy "activities: vlasnik mijenja" on public.activities for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
  );
create policy "activities: vlasnik briše" on public.activities for delete to authenticated
  using ((select auth.uid()) = user_id);

-- settings – red stvara okidač, korisnik ga samo čita i mijenja
create policy "settings: vlasnik čita"    on public.settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings: vlasnik mijenja" on public.settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- push_subscriptions
create policy "push: vlasnik čita"    on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "push: vlasnik dodaje"  on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push: vlasnik mijenja" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push: vlasnik briše"   on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

-- notification_logs – samo čitanje; zapisuje server
create policy "logs: vlasnik čita" on public.notification_logs for select to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Storage: privatni prilozi (PDF i fotografije)
-- Putanja: {user_id}/{vehicle_id}/{activity_id}/{naziv}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "attachments: vlasnik čita" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments: vlasnik dodaje" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments: vlasnik mijenja" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments: vlasnik briše" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
