/**
 * Dinamik Expo yapilandirmasi.
 *
 * Statik ayarlar app.json icinde durur; burada yalnizca ortama gore degisen
 * kisimlar eklenir. Uc derleme bicimi var:
 *
 *   APP_VARIANT=dev   Metro'ya bagli gelistirme surumu. Ayri paket kimligi ve
 *                     ayri ad kullanir, boylece gunluk kullanilan surumun
 *                     uzerine kurulmaz; ikisi telefonda yan yana durur.
 *   (varsayilan)      Yerel yayin derlemesi: JS paketi gomulu, Metro gerekmez.
 *                     Ucretsiz Apple hesabiyla imzalanabilir.
 *   APP_ENV=production  Magaza derlemesi (EAS). Push yetkisi korunur.
 *
 * Yayin derlemesi icin:  APP_ENV=production npx expo prebuild --clean
 */

const IS_PRODUCTION =
  process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

/** Metro'ya bagli gelistirme surumu; `scripts/dev.sh` bu degiskeni verir. */
const IS_DEV_VARIANT = process.env.APP_VARIANT === 'dev';

/**
 * Gelistirme derlemesinde JS paketi Mac'te calisan Metro sunucusundan
 * indirilir. Bunun icin uygulamanin yerel aga erisebilmesi (iOS 14+ izni) ve
 * duz HTTP baglantisi kurabilmesi (ATS) gerekir.
 *
 * Yayin derlemesinde JS paketi uygulamaya gomulu geldigi icin bu izinlerin
 * hicbirine ihtiyac yoktur; kullaniciya gereksiz izin penceresi cikmamasi ve
 * App Store incelemesinde ATS gerekcesi istenmemesi icin eklenmezler.
 */
const developmentInfoPlist = {
  NSLocalNetworkUsageDescription:
    'Allow sportpulse to connect to the local development server.',
  NSAppTransportSecurity: {
    NSAllowsArbitraryLoads: true,
    NSAllowsLocalNetworking: true,
  },
};

module.exports = ({ config }) => ({
  ...config,
  name: IS_DEV_VARIANT ? 'sportpulse dev' : config.name,
  // Iki surum ayni deep link semasini kaydederse hangisinin acilacagi belirsiz
  // kalir; gelistirme surumu kendi semasini kullanir.
  scheme: IS_DEV_VARIANT ? 'sportpulsedev' : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV_VARIANT
      ? `${config.ios?.bundleIdentifier}.dev`
      : config.ios?.bundleIdentifier,
    infoPlist: {
      ...config.ios?.infoPlist,
      ...(IS_DEV_VARIANT ? developmentInfoPlist : {}),
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    './plugins/withUIScene',
    ['./plugins/withPodMinimumDeploymentTarget', { deploymentTarget: '16.4' }],
    // Ucretsiz Apple hesabi push yetkisi saglayamiyor; yalnizca magaza
    // derlemesinde korunur, yerel derlemelerin ikisinde de cikarilir.
    ...(IS_PRODUCTION ? [] : ['./plugins/withoutPushEntitlement']),
    // Cihazin Metro'yu ag degisimlerinden bagimsiz bulabilmesi icin; yalnizca
    // Metro'ya baglanan surumde anlamli.
    ...(IS_DEV_VARIANT ? ['./plugins/withMetroHost'] : []),
  ],
});
