// Oturum acmis kullanici kontrolu, istek uzerine calisan fonksiyonlar icin.
//
// Neden: anon anahtar uygulama paketiyle dagitildigi icin herkesin elinde
// sayilir. `verify_jwt` acik olsa bile anon anahtarin kendisi gecerli bir JWT
// oldugundan tek basina kimlik dogrulamaz. Kimlik sorulmazsa bu fonksiyonlar
// disaridan cagrilip saglayici ve Gemini kotasi tuketilebilir -- onbellek
// maliyeti sinirlar ama sifirlamaz.
//
// Senkron fonksiyonlari (sync-events, sync-teams, mirror-logos) bunun yerine
// SYNC_SECRET ile korunur; onlari kullanici degil zamanlanmis is cagirir.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** Istekteki JWT gercek bir kullaniciya mi ait. Anon anahtar icin false. */
export async function hasUser(
  supabase: SupabaseClient,
  request: Request,
): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? '';
  const jwt = header.replace(/^Bearer\s+/i, '').trim();
  if (jwt === '') return false;
  // Anon anahtarda `sub` claim'i yok; getUser bu durumda kullanici dondurmez.
  const { data } = await supabase.auth.getUser(jwt);
  return data.user !== null;
}
