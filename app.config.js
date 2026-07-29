/**
 * Dinamik Expo yapilandirmasi.
 *
 * Statik ayarlar app.json icinde durur; burada yalnizca ortama gore degisen
 * kisimlar eklenir.
 *
 * Yayin derlemesi icin:  APP_ENV=production npx expo prebuild --clean
 */

const IS_PRODUCTION =
  process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

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
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      ...(IS_PRODUCTION ? {} : developmentInfoPlist),
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    './plugins/withUIScene',
    ['./plugins/withPodMinimumDeploymentTarget', { deploymentTarget: '16.4' }],
    // Ucretsiz Apple hesabi push yetkisi saglayamiyor; yayin derlemesinde korunur.
    ...(IS_PRODUCTION ? [] : ['./plugins/withoutPushEntitlement']),
  ],
});
