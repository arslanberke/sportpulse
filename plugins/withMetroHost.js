const { withAppDelegate } = require('expo/config-plugins');
const { execFileSync } = require('child_process');

/**
 * Gelistirme derlemesinde Metro sunucusunun adresini sabitler.
 *
 * React Native, cihazin Metro'yu bulabilmesi icin derleme sirasinda uygulamaya
 * bir `ip.txt` gomer (react-native/scripts/react-native-xcode.sh). O script en0
 * ile en8 arasindaki arayuzleri dolasip buldugu ilk IP adresini yazar;
 * REACT_NATIVE_PACKAGER_HOSTNAME degiskenini dikkate almaz. Sonuc olarak Mac
 * birden fazla aga bagliyken (ornegin ev agi + telefona internet paylasimi)
 * yanlis arayuzun adresi gomulebilir ve cihaz Metro'ya ulasamaz. Boyle bir
 * durumda uygulama gomulu bundle'a duser ve su hatayi verir:
 *
 *   [runtime not ready]: Error: Cannot create devtools websocket connections
 *   in embedded environments.
 *
 * Duz IP gomulmesinin ikinci sorunu, adresin ag her degistiginde gecersiz
 * kalmasi ve uygulamanin yeniden derlenmesini gerektirmesidir.
 *
 * Bu yuzden adres olarak Mac'in Bonjour adi (<isim>.local) kullanilir; bu ad
 * IP degisse de sabit kalir. Deger prebuild aninda belirlenir ve yalnizca
 * DEBUG dalina yazilir, dolayisiyla yayin derlemelerini etkilemez.
 *
 * mDNS'in engelli oldugu bir agda REACT_NATIVE_PACKAGER_HOSTNAME ile elle
 * adres verilebilir.
 */
function resolveMetroHost() {
  const override = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (override) {
    return override;
  }
  const localHostName = execFileSync('scutil', ['--get', 'LocalHostName'], {
    encoding: 'utf8',
  }).trim();
  if (!localHostName) {
    throw new Error('withMetroHost: Mac icin LocalHostName okunamadi.');
  }
  return `${localHostName}.local`;
}

const DEBUG_BRANCH = `#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")`;

module.exports = function withMetroHost(config) {
  return withAppDelegate(config, (cfg) => {
    const host = resolveMetroHost();
    let contents = cfg.modResults.contents;

    // Prebuild tekrar kosuldugunda yalnizca adresi guncelle.
    if (contents.includes('jsLocation =')) {
      cfg.modResults.contents = contents.replace(
        /jsLocation = "[^"]*"/,
        `jsLocation = "${host}"`
      );
      return cfg;
    }

    if (!contents.includes(DEBUG_BRANCH)) {
      throw new Error(
        'withMetroHost: AppDelegate.swift beklenen yapida degil, bundleURL DEBUG dali bulunamadi.'
      );
    }

    contents = contents.replace(
      DEBUG_BRANCH,
      `#if DEBUG
    // Gomulu ip.txt yerine sabit Bonjour adi; ayrintilar plugins/withMetroHost.js
    RCTBundleURLProvider.sharedSettings().jsLocation = "${host}"
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")`
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};
