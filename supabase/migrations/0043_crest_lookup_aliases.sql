-- Arma aramasinda ad dogrulamasini gecemeyen kulupler.
--
-- Arma arandiginda kaynak kulubu kendi yazimiyla donduruyor: "CSKA 1948 Sofia"
-- icin "CSKA 1948", "Dunajska Streda" icin "DAC 1904 Dunajská Streda". Ad
-- tutmadigi icin arma yazilmadi ve kartlarda yer tutucu kaldi.
--
-- Ad dogrulamasinin gevsetilmemesi bilincli: ayni arama "FK Auda" icin
-- "Reggiana" donduruyor, yani onek/sonek toleransi yanlis armaya kapi acardi.
-- Dogrulanan ciftler tek tek buraya eklenir.
--
-- ML Vitebsk eklenmedi: kaynakta armali bir karsiligi yok, yer tutucu kaliyor.

insert into public.team_name_aliases (team_id, alias_folded)
select t.id, fold_team_name(pair.alias)
  from (values
    ('CSKA 1948 Sofia', 'CSKA 1948'),
    ('Dunajska Streda', 'DAC 1904 Dunajská Streda')
  ) as pair(team_name, alias)
  join teams t on t.name = pair.team_name and t.sport_id = 'football'
on conflict do nothing;
