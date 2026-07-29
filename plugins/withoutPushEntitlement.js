const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * expo-notifications, entitlements dosyasina 'aps-environment' ekler. Ucretsiz
 * (personal) Apple gelistirici takimlari Push Notifications yetenegini
 * saglayamadigi icin cihaza derleme su hatayla basarisiz olur:
 *
 *   Personal development teams ... do not support the Push Notifications capability
 *
 * Bu eklenti yetkiyi yalnizca gelistirme derlemesinden cikarir. Yerel
 * bildirimler bu yetki olmadan da calisir; yalnizca uzaktan push devre disi kalir.
 *
 * Ucretli hesaba gecildiginde bu eklenti app.config.js'den kaldirilmalidir.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
