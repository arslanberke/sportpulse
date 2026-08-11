-- Kullanicinin yildizladigi kulupler.
--
-- Takipten ayri bir kayit olmasi gerekiyor. Takip "joker" mantigiyla tutuluyor:
-- Super Lig takip edildiginde tek bir lig satiri yaziliyor, takimlarin ayri
-- satiri olmuyor (bkz. `useFollowActions`). Dolayisiyla mevcut takip satirina
-- bir "favori" bayragi eklemek Besiktas'i yildizlamaya yetmezdi -- oyle bir
-- satir yok.
--
-- Ikisi farkli sorulara cevap veriyor: takip "listede ne gorunsun", favori
-- "hangisi one ciksin". Favori olmak takip gerektirmez; ligi takip eden
-- kullanici icindeki bir kulubu yildizlayabilir.
--
-- Sporcular sonra eklenecek (tenis/UFC icin oyuncu duzeyinde mac verisi henuz
-- cekilmiyor); o zaman bu tabloya `player_id` kolonu eklenir.

create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index user_favorites_user_idx on public.user_favorites (user_id);

alter table public.user_favorites enable row level security;

create policy "kendi favorilerini okur"
  on public.user_favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "kendi favorisini ekler"
  on public.user_favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "kendi favorisini siler"
  on public.user_favorites for delete
  to authenticated
  using (auth.uid() = user_id);
