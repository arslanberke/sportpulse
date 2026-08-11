-- Yildizlanan sporcular.
--
-- Favori tablosu yalnizca kulup tutuyordu. Bireysel sporlarda karsilasan taraf
-- kisi oldugu icin ("Sinner vs Alcaraz") tenis ve UFC'de yildizlanacak bir kulup
-- yok; kullanicinin istedigi de tam olarak buydu.
--
-- Iki kolon yan yana duruyor ve tam olarak biri dolu olmak zorunda: bir favori
-- ya kulup ya sporcu, ikisi birden degil. Ayri iki tablo yerine tek tablo
-- olmasi, "yildizlarim" listesini tek sorguda vermesi icin.

alter table public.user_favorites
  drop constraint user_favorites_pkey;

alter table public.user_favorites
  alter column team_id drop not null,
  add column player_id uuid references public.players(id) on delete cascade,
  add column id uuid primary key default gen_random_uuid(),
  add constraint favorite_is_team_or_player
    check ((team_id is not null) <> (player_id is not null));

-- Ayni kulup/sporcu iki kez yildizlanamaz.
create unique index user_favorites_team_idx
  on public.user_favorites (user_id, team_id) where team_id is not null;
create unique index user_favorites_player_idx
  on public.user_favorites (user_id, player_id) where player_id is not null;
