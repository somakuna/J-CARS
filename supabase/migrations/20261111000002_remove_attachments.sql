-- Prilozi aktivnosti nisu potrebni (odluka korisnika, 11.11.2026.).
-- Uklanja se stupac i pravila pristupa za bucket „attachments”.
-- Sam bucket Supabase ne dopušta obrisati SQL-om; prazan je i bez pravila
-- nije dostupan nikome osim secret ključu. Može se obrisati u Dashboardu (Storage).

alter table public.activities drop column if exists attachment_path;

drop policy if exists "attachments: vlasnik čita" on storage.objects;
drop policy if exists "attachments: vlasnik dodaje" on storage.objects;
drop policy if exists "attachments: vlasnik mijenja" on storage.objects;
drop policy if exists "attachments: vlasnik briše" on storage.objects;
