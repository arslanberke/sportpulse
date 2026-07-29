# sportpulse

Expo (React Native) + expo-router uygulamasi. Backend Supabase.

## Fiziksel iPhone uzerinde gelistirme

```bash
npm run dev          # Metro sunucusu
npm run dev:phone    # derle + cihaza kur + baslat (ilk kurulumda ve native degisiklikten sonra)
```

Ikisi de `scripts/dev.sh` uzerinden calisir; gerekli ortam degiskenlerini kendi
ayarlar, elle bir sey vermek gerekmez.

### Metro adresi neden Bonjour adi

Cihaza gomulen Metro adresi **derleme aninda** belirlenir. Duz IP gomulurse ag
her degistiginde (ev agi, hotspot, USB paylasimi) adres gecersiz kalir; uygulama
Metro'ya ulasamaz, gomulu bundle'a duser ve su hatayi verir:

```
Could not connect to development server.
[runtime not ready]: Error: Cannot create devtools websocket connections in embedded environments.
```

Adresi `REACT_NATIVE_PACKAGER_HOSTNAME` ile duzeltmek **yetmez**: adresi gomen
`react-native/scripts/react-native-xcode.sh` bu degiskeni yok sayar, en0-en8
arasindaki ilk arayuzun IP'sini `ip.txt` olarak yazar. Mac birden fazla aga
bagliyken (ev agi + telefona internet paylasimi) yanlis arayuz secilebilir.

Cozum `plugins/withMetroHost.js`: AppDelegate'in DEBUG dalina Mac'in Bonjour
adini (`<isim>.local`) sabitler, boylece `ip.txt` devre disi kalir ve adres IP
degisimlerinden etkilenmez. Yalnizca gelistirme derlemelerinde etkindir.

mDNS'in engelli oldugu bir agda elle adres vermek icin:
`REACT_NATIVE_PACKAGER_HOSTNAME=<mac-ip> npx expo prebuild -p ios && npm run dev:phone`

Hatanin JS tarafindaki kaynagi:
`node_modules/expo/src/async-require/messageSocket.native.ts` icinde
`getDevServer().bundleLoadedFromServer` false oldugunda atilir.

### Xcode

iOS derlemesi **tam Xcode** gerektirir; `xcode-select` CommandLineTools'u
gosteriyorsa derleme yapilamaz. `scripts/dev.sh` bu yuzden `/Applications`
icindeki Xcode'u bulup `DEVELOPER_DIR` olarak isaret eder, sistem ayarina
dokunmaz. Sistem ayarini kalici duzeltmek istersen (sudo gerekir):

```bash
sudo xcode-select -s /Applications/Xcode-beta.app/Contents/Developer
```

### Cihazi uzaktan kontrol

`devicectl` (Xcode 27 ile gelir) fiziksel cihazda calisir; telefonun **kilidi
acik** olmali, aksi halde "developer disk image could not be mounted" hatasi
gelir.

```bash
npm run phone:launch          # uygulamayi cihazda yeniden baslat
npm run phone:shot            # ekran goruntusu -> /tmp/sportpulse-screen.png
npm run phone:log             # uygulama loglarini akit (idevicesyslog)
```

`libimobiledevice` araclarinin cogu (`idevicedebug`, `idevicescreenshot`) iOS 17+
cihazlarda developer disk image gerektirdigi icin calismaz; `idevicesyslog`
calisir. Ekran goruntusu ve uygulama baslatma icin `devicectl` kullanilmali.

## Dogrulama

```bash
npx tsc --noEmit     # tip kontrolu
npm run lint
```

## Notlar

- `ios/` ve `android/` uretilen klasorlerdir, git'te tutulmaz (`expo prebuild`).
- Ucretsiz Apple hesabi kullaniliyor: push yetkisi yok (bkz.
  `plugins/withoutPushEntitlement.js`) ve cihaza kurulan uygulama 7 gunde
  suresi doler, sonrasinda `npm run dev:phone` ile yeniden kurulmasi gerekir.
- Live Activity modulu (`modules/live-activity`) yalnizca iOS derlemelerinde
  vardir; Expo Go ve web'de `null` doner.
