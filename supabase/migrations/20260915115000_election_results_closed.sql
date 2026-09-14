-- Ergebnisse laufender Abstimmungen nicht an alle Mitglieder herausgeben.
--
-- Die Abstimmungsseite verspricht: „Das Ergebnis wird nach Abschluss
-- sichtbar." Die Oberfläche hielt sich daran, die Datenbank nicht –
-- get_election_results() lieferte jedem Mitglied die Stimmen aller
-- Abstimmungen, auch der laufenden. Wer die Schnittstelle direkt aufrief,
-- sah den Zwischenstand, und ein Zwischenstand kann eine Abstimmung kippen.
--
-- Jetzt: geschlossene Abstimmungen für alle Mitglieder, laufende nur für die,
-- die Abstimmungen verwalten. Deren Zähler „11/17 Stimmen" braucht die
-- Oberfläche während der Abstimmung.

create or replace function public.get_election_results()
returns table (candidate_id uuid, candidate_name text, election_id uuid, vote_count bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id, c.name, c.election_id, count(v.id)
  from public.candidates c
  join public.elections e on e.id = c.election_id
  left join public.votes v on v.candidate_id = c.id
  where public.is_member(auth.uid())
    and (e.status = 'closed' or public.has_permission(auth.uid(), 'elections.manage'))
  group by c.id, c.name, c.election_id;
$$;

revoke all on function public.get_election_results() from public, anon;
grant execute on function public.get_election_results() to authenticated, service_role;
