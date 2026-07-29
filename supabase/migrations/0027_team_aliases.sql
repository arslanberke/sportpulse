-- Match a club by the other names it goes by.
--
-- EuroLeague writes its clubs with the city and the sponsor attached —
-- "Anadolu Efes Istanbul", "Besiktas Istanbul" — while the domestic league
-- calls them "Anadolu Efes" and "Beşiktaş". Neither ids nor name folding
-- bridge that, so the same club was landing twice, once per competition.
--
-- A plain prefix rule would be wrong: "İstanbulspor" folds to "istanbul" and
-- would swallow "İstanbul Başakşehir". So instead the caller passes the
-- alternative names the source itself provides (short name, name without the
-- city) and matching tries those too — no guessing on our side.

drop function if exists public.upsert_team(jsonb, text, uuid, text, text, boolean);

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

-- Fold the split clubs that are already in the table. Restricted to rows the
-- EuroLeague sync created (they alone carry a 'euroleague' id and no other),
-- matched against a club whose name they extend, so unrelated clubs that
-- merely share a first word are untouched.
do $$
declare
  r record;
begin
  for r in
    select keep.id as keep_id, drop_row.id as drop_id
    from teams keep
    join teams drop_row
      on drop_row.sport_id = keep.sport_id
     and drop_row.id <> keep.id
     and drop_row.external_ids ? 'euroleague'
     and not (keep.external_ids ? 'euroleague')
     and fold_team_name(drop_row.name) like fold_team_name(keep.name) || ' %'
    where fold_team_name(keep.name) <> ''
  loop
    perform merge_teams(r.keep_id, r.drop_id);
  end loop;
end;
$$;
