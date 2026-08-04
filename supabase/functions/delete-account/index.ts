// Kullanicinin kendi hesabini silmesi.
//
// Neden sunucuda: kullanici silmek yonetici yetkisi (service_role) gerektirir,
// istemciden yapilamaz. Yalnizca istegi yapan kisinin kendi hesabi silinir --
// silinecek kimlik govdeden degil, dogrulanmis JWT'den okunur.
//
// App Store 5.1.1(v): hesap olusturmaya izin veren uygulama, hesabin uygulama
// icinden silinmesini de sunmak zorunda. KVKK m.7 ve m.11 (silme talebi) da
// ayni yonde.
//
// Iliskili veriler ayrica silinmiyor: profiles auth.users'a, user_follows /
// user_reminder_prefs / notifications / push_tokens ise profiles'a CASCADE ile
// bagli, dolayisiyla kullanici satiri gidince hepsi gidiyor.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { currentUser } from '../_shared/require-user.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const user = await currentUser(supabase, request);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
