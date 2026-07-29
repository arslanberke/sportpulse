-- Let an authoritative roster rename the club it just matched.
--
-- Merging kept whichever row was created first, so clubs ended up wearing the
-- data provider's label — "Besiktas Basketbol", "Fenerbahçe Volleyball",
-- "Manisa BB" — instead of the name they are known by. The name is only
-- overwritten when the caller says the list is a complete, authoritative one,
-- so a partial feed can never rename a club back.

-- The extra argument would otherwise leave two overloads behind, and a call
-- naming only the first five would no longer resolve.
drop function if exists public.upsert_team(jsonb, text, uuid, text, text);

create or replace function public.upsert_team(
  p_external_ids jsonb,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null,
  p_rename boolean default false
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_key text;
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
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_name, p_logo_url, p_external_ids)
      returning id into v_team_id;
  else
    update teams set
      name = case when p_rename then p_name else name end,
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
