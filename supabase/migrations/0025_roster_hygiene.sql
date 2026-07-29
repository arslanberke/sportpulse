-- Two leftovers from pulling rosters out of several sources.
--
-- 1. Providers tack the branch onto the club name: TheSportsDB's "Fenerbahçe
--    Basketbol" and "Fenerbahçe Volleyball" are the club Wikipedia simply
--    calls "Fenerbahçe". The fold now drops those words too. It is safe
--    because names are only ever compared within one sport, so removing the
--    sport word cannot merge a football club into a basketball one.
--
-- 2. A league's membership was only ever added to, so relegated clubs — and,
--    in Sultanlar Ligi, men's teams that TheSportsDB filed under the same
--    league — stayed on forever. set_league_roster() lets a sync that has the
--    real entry list say "these, and only these".

drop index if exists teams_folded_name_idx;

create or replace function public.fold_team_name(p_name text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(extensions.unaccent(translate(p_name, 'İıŞşĞğÇçÖöÜü', 'IiSsGgCcOoUu'))),
            '[^a-z0-9]+', ' ', 'g'
          ),
          -- Legal forms and generic club words, wherever they appear.
          '\y(fc|cf|sc|ac|sk|fk|sfk|bb|bk|bc|cd|ud|if|sv|tsv|as|ss|us|afc|cfc|gsk|club|kulubu|spor kulubu)\y',
          ' ', 'g'
        ),
        -- The branch of the club, which only one provider bothers to spell out.
        '\y(basketbol|basketball|basket|voleybol|volleyball|futbol|football|women|kadin|erkek)\y',
        ' ', 'g'
      ),
      -- Turkish "-spor" suffix: Erzurumspor -> erzurum.
      'spor\y', '', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create index teams_folded_name_idx
  on public.teams (sport_id, public.fold_team_name(name));

-- Fold together the duplicates the stronger rule now recognises. The row with
-- the most provider ids wins, so the club keeps its links to every feed.
do $$
declare
  r record;
begin
  for r in
    select sport_id, fold_team_name(name) as folded,
           array_agg(id order by jsonb_array_length(
             coalesce(jsonb_path_query_array(external_ids, '$.keyvalue()'), '[]'::jsonb)) desc,
             logo_url nulls last) as ids
    from teams
    where fold_team_name(name) <> ''
    group by 1, 2
    having count(*) > 1
  loop
    for i in 2 .. array_length(r.ids, 1) loop
      perform merge_teams(r.ids[1], r.ids[i]);
    end loop;
  end loop;
end;
$$;

/**
 * Replaces a league's membership with the given clubs.
 *
 * Only called with an authoritative entry list (the competition's own feed or
 * the season article). Memberships that a real fixture backs are kept even if
 * they are missing from the list, so a cup entrant never disappears because
 * one source doesn't mention it.
 */
create or replace function public.set_league_roster(
  p_league_id uuid,
  p_team_ids uuid[]
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_removed integer;
begin
  delete from league_teams lt
  where lt.league_id = p_league_id
    and not (lt.team_id = any(p_team_ids))
    and not exists (
      select 1 from events e
      where e.league_id = p_league_id
        and (e.home_team_id = lt.team_id or e.away_team_id = lt.team_id)
    );
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

revoke execute on function public.set_league_roster from public, anon, authenticated;
