-- Fold the clubs that ESPN and TheSportsDB spell differently.
--
-- "Ajax" / "Ajax Amsterdam", "Estoril" / "Estoril Praia", "Hoffenheim" /
-- "TSG Hoffenheim": one feed drops the city, the other keeps it, so the same
-- club sat in the league twice.
--
-- The rule is a name that extends another by exactly one word — but only when
-- the two rows are already listed in the SAME competition. That evidence is
-- what makes it safe: "İstanbulspor" folds to "istanbul" and would otherwise
-- swallow "İstanbul Başakşehir", but those two play in different leagues.
--
-- Going forward this shouldn't recur: both providers now pass their alternate
-- spellings to upsert_team, which matches on them.

do $$
declare
  r record;
begin
  for r in
    select keep.id as keep_id, drop_row.id as drop_id,
           keep.name as keep_name, drop_row.name as drop_name
    from teams keep
    join teams drop_row
      on drop_row.sport_id = keep.sport_id
     and drop_row.id <> keep.id
     and fold_team_name(drop_row.name) like fold_team_name(keep.name) || ' %'
     and array_length(string_to_array(fold_team_name(drop_row.name), ' '), 1)
         = array_length(string_to_array(fold_team_name(keep.name), ' '), 1) + 1
    where fold_team_name(keep.name) <> ''
      and exists (
        select 1
        from league_teams a
        join league_teams b on b.league_id = a.league_id
        where a.team_id = keep.id and b.team_id = drop_row.id
      )
  loop
    raise notice 'merging % <- %', r.keep_name, r.drop_name;
    perform merge_teams(r.keep_id, r.drop_id);
  end loop;
end;
$$;

-- The mirror case — an extra word at the FRONT, "Hoffenheim" vs "TSG
-- Hoffenheim" — is not generalised: the same shape also matches "AC Milan"
-- against "Inter Milan", which are two different clubs in the same league.
-- The one real pair is merged by name instead.
do $$
declare
  v_keep uuid;
  v_drop uuid;
begin
  select id into v_keep from teams
    where sport_id = 'football' and name = 'Hoffenheim';
  select id into v_drop from teams
    where sport_id = 'football' and name = 'TSG Hoffenheim';
  if v_keep is not null and v_drop is not null then
    perform merge_teams(v_keep, v_drop);
  end if;
end;
$$;
