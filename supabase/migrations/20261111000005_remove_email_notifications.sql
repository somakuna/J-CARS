-- Obavijesti samo push porukama: e-mail obavijesti (Resend) uklonjene su na zahtjev korisnika (11.11.2026.).
-- Briše postavke e-maila i zapise o poslanim e-mailovima; kanal u evidenciji može biti samo 'push'.
begin;

-- Novi korisnik dobiva red postavki bez e-mail adrese.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.settings
  drop column if exists email_address,
  drop column if exists email_notifications_enabled;

delete from public.notification_logs where notification_type <> 'push';

alter table public.notification_logs
  drop constraint if exists notification_logs_notification_type_check,
  add constraint notification_logs_notification_type_check check (notification_type = 'push');

alter table public.notification_logs
  alter column notification_type set default 'push';

commit;
