import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

// Href tipi bu surumde yalnizca paketin ic modulunden erisilebiliyor.
type Target = Parameters<typeof router.push>[0];

/**
 * Bir deep link uygulamayi sifirdan baslattiginda hedef ekrana gider.
 *
 * Kok yerlesim, oturum diskten okunurken hicbir navigator kurmuyor
 * (src/app/_layout.tsx). Deep link tam o anda islendigi icin hedef rota henuz
 * mevcut olmaz ve baglanti sessizce dusurulur; kullanici ana ekranda kalir.
 * Bu kanca korumali yerlesim kuruldugunda -- yani rotalar artik varken --
 * baslangic baglantisini yeniden ele alir.
 *
 * Uygulama zaten acikken gelen baglantilar icin gerekli degildir; o durumda
 * navigator mevcut oldugu icin expo-router baglantiyi kendisi isler.
 */
export function useLaunchDeepLink() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    void Linking.getInitialURL().then((url) => {
      if (handled.current || !url) return;
      handled.current = true;

      // sportpulse://settings gibi bir baglantida "settings" hostname olarak
      // ayrisir, sportpulse:///settings biciminde ise path olur. Iki bicim de
      // ayni ekrani gostermeli, bu yuzden ikisi birlestirilir.
      //
      // Supabase'in oturum baglantilari yalnizca sorgu parametresi tasir
      // (bkz. use-auth-deep-link); ikisi de bos kalir ve yonlendirme yapilmaz.
      const { hostname, path } = Linking.parse(url);
      const target = [hostname, path].filter(Boolean).join('/').replace(/^\/+/, '');
      if (!target) return;

      // replace degil push: sekmeler yigindaki yerini korur, boylece hedef
      // ekrandan geri donulebilir.
      //
      // Hedef calisma aninda geldigi icin tipli rotalarla dogrulanamaz;
      // bilinmeyen bir yol expo-router tarafindan zaten yok sayilir.
      router.push(`/${target}` as Target);
    });
  }, []);
}
