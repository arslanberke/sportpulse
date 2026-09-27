-- API-Sports shortens the club to "Amed" while our canonical team is
-- "Amed SFK". Live rescue must resolve the provider spelling to the existing
-- club before calling upsert_event, otherwise a duplicate "Amed" team would
-- be created.

insert into public.team_name_aliases (team_id, alias_folded)
select id, fold_team_name('Amed')
from public.teams
where sport_id = 'football' and fold_team_name(name) = fold_team_name('Amed SFK')
on conflict do nothing;
