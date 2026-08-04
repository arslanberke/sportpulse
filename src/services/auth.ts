import { authRedirectUrl } from '@/features/auth/auth-redirect';
import { supabase } from '@/services/supabase';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

export async function signUp({ email, password, fullName }: SignUpParams) {
  // Metadata is picked up by a database trigger that creates the profile row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Brings the user back into the app after they confirm their email
      // instead of onto the project's default Site URL (localhost).
      emailRedirectTo: authRedirectUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Kullanicinin hesabini ve ona bagli her seyi siler.
 *
 * Silme islemi yonetici yetkisi gerektirdigi icin Edge Function'da yapilir;
 * istemci yalnizca kendi oturumunu gonderir. Iliskili satirlar (profil,
 * takipler, hatirlatma tercihleri, bildirimler, push kayitlari) veritabaninda
 * CASCADE ile bagli oldugu icin ayrica temizlenmesi gerekmiyor.
 */
export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke<{ deleted: boolean }>(
    'delete-account',
  );
  if (error) throw error;
  if (!data?.deleted) throw new Error('Account was not deleted');
  // Hesap sunucuda yok artik; token'i sunucuya sormadan yerelde temizle, aksi
  // halde signOut gecersiz oturum icin hata dondurur. Oturum silinince kok
  // yerlesim otomatik olarak giris ekranina doner.
  await supabase.auth.signOut({ scope: 'local' });
}
