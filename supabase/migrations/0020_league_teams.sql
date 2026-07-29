-- A club plays in more than one competition.
--
-- `teams.league_id` can only hold one, so whichever sync touched a club first
-- claimed it: Galatasaray landed under the Champions League and disappeared
-- from the Süper Lig list. Membership is really many-to-many, so it moves to
-- its own table. `teams.league_id` stays as the club's home competition (used
-- for grouping and as a fallback), but the follow screens read this.

create table public.league_teams (
  league_id uuid not null references public.leagues (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (league_id, team_id)
);

create index league_teams_team_idx on public.league_teams (team_id);

alter table public.league_teams enable row level security;
create policy "Catalog is readable" on public.league_teams for select using (true);

-- Everything we already know from the single-league column.
insert into public.league_teams (league_id, team_id)
select league_id, id from public.teams where league_id is not null
on conflict do nothing;

-- upsert_team now records membership instead of silently keeping the first
-- league it ever saw.
create or replace function public.upsert_team(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if p_external_id is not null then
    select id into v_team_id from teams
      where external_ids ->> p_provider = p_external_id;
  end if;

  if v_team_id is null then
    select id into v_team_id from teams
      where sport_id = p_sport_id and name = p_name;
  end if;

  if v_team_id is null then
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (
        p_sport_id, p_league_id, p_name, p_logo_url,
        case when p_external_id is null then '{}'::jsonb
             else jsonb_build_object(p_provider, p_external_id) end
      )
      returning id into v_team_id;
  else
    update teams set
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
      external_ids = case when p_external_id is null then external_ids
                          else external_ids || jsonb_build_object(p_provider, p_external_id) end
      where id = v_team_id;
  end if;

  if p_league_id is not null then
    insert into league_teams (league_id, team_id)
      values (p_league_id, v_team_id)
      on conflict do nothing;
  end if;

  return v_team_id;
end;
$$;

revoke execute on function public.upsert_team from public, anon, authenticated;

-- Fixtures are the other source of membership: if a club plays a match in a
-- competition, it belongs to it. A trigger covers every write path (including
-- upsert_event) without duplicating the logic there.
create function public.record_event_team_membership()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.league_id is not null then
    insert into league_teams (league_id, team_id)
      select new.league_id, team_id
      from (values (new.home_team_id), (new.away_team_id)) as t (team_id)
      where team_id is not null
      on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger events_team_membership
  after insert or update of league_id, home_team_id, away_team_id on public.events
  for each row execute function public.record_event_team_membership();

-- Backfill from fixtures already in the table.
insert into public.league_teams (league_id, team_id)
select e.league_id, t.team_id
from public.events e
cross join lateral (values (e.home_team_id), (e.away_team_id)) as t (team_id)
where e.league_id is not null and t.team_id is not null
on conflict do nothing;
