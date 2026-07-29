-- Stop the club name from flip-flopping between competitions.
--
-- Renaming on any authoritative list meant the last sync won: the Eredivisie
-- feed calls the club "Ajax", the Champions League feed "Ajax Amsterdam", so
-- the row's name changed every few hours depending on the chunk order.
--
-- The shortest name wins instead. It converges no matter what order the
-- leagues are synced in, and it happens to be the fix for the original
-- complaint too: "Fenerbahçe" beats "Fenerbahçe Volleyball", "Beşiktaş"
-- beats "Besiktas Basketbol", while "Ajax" is never overwritten by the
-- longer form.

create or replace function public.upsert_team(
  p_external_ids jsonb,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null,
  p_rename boolean default false,
  p_aliases text[] default '{}'
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_key text;
  v_alias text;
begin
  -- Any id the provider knows is enough to recognise the club.
  for v_key in select jsonb_object_keys(p_external_ids) loop
    select id into v_team_id from teams
      where external_ids ->> v_key = p_external_ids ->> v_key;
    exit when v_team_id is not null;
  end loop;

  if v_team_id is null then
    select id into v_team_id from teams
      where sport_id = p_sport_id
        and fold_team_name(name) = fold_team_name(p_name);
  end if;

  if v_team_id is null then
    foreach v_alias in array p_aliases loop
      continue when fold_team_name(v_alias) = '';
      select id into v_team_id from teams
        where sport_id = p_sport_id
          and fold_team_name(name) = fold_team_name(v_alias);
      exit when v_team_id is not null;
    end loop;
  end if;

  if v_team_id is null then
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_name, p_logo_url, p_external_ids)
      returning id into v_team_id;
  else
    update teams set
      name = case
        when p_rename and length(p_name) < length(name) then p_name
        else name
      end,
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
      external_ids = external_ids || p_external_ids
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
