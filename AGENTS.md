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

### Imza profili suresi dolunca

Ucretsiz hesabin profili 7 gunde doler. Once uygulama cihazda "erisilebilir
degil" der, sonra `npm run dev:phone` su hatayla durur:

```
No profiles for 'com.berkearslan.sportpulse' were found
```

`expo run:ios` xcodebuild'e `-allowProvisioningUpdates` gecmedigi icin profili
kendisi yenileyemez. Profil bir kez elle yenilenir, sonra normal akisa donulur:

```bash
cd ios && xcodebuild -workspace sportpulse.xcworkspace -scheme sportpulse \
  -configuration Debug -destination "id=$(idevice_id -l | head -1)" \
  -allowProvisioningUpdates build
```

Ardindan **telefonda** yeni sertifikaya guvenilmeli (Ayarlar > Genel > VPN ve
Cihaz Yonetimi > Geliştirici Uygulaması > Guven), aksi halde `devicectl`
"invalid code signature ... not been explicitly trusted" ile baslatmaz.

Bu xcodebuild cagrisi yalnizca profili yenilemek icindir; kurulum icin
`npm run dev:phone` kullanilmali. Elle derlenen paket cihaza kurulursa
`dev.sh`'nin verdigi Metro adresi gomulmedigi icin uygulama gomulu bundle'a
duser ("Cannot create devtools websocket connections in embedded environments").

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

Ekran goruntusu o anda ekranda ne varsa onu alir; kullanici telefonu
kullaniyorsa ozel icerik yakalanabilir. Goruntu yalnizca uygulama on plana
alindiktan hemen sonra alinmali.

### Bir ekrani dokunmadan test etmek

`devicectl` dokunma gonderemez, ama expo-router rotalari deep link ile
dogrudan acilabilir. Ekranlari tek tek dogrulamanin en hizli yolu budur:

```bash
DEV=$(xcrun devicectl list devices | awk '/physical/{print}' \
  | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' | head -1)
xcrun devicectl device process launch --terminate-existing --device "$DEV" \
  --payload-url "sportpulse://follow/sport/football" com.berkearslan.sportpulse
```

Dokunma gerektiren durumlar (arama alanini acmak gibi) icin ilgili useState
baslangic degeri gecici olarak degistirilip goruntu alinabilir.

## Dogrulama

```bash
npx tsc --noEmit     # tip kontrolu
npm run lint
```

## Yasal metinler

Aydinlatma metninin kaynagi `src/features/legal/privacy-notice.ts`. Metin
degistiginde barindirilan surum de yenilenmeli:

```bash
npm run legal:html   # -> docs/privacy.html
```

Iki surum gerekiyor cunku App Store Connect gizlilik politikasi icin **URL**
istiyor ve uygulama icindeki ekran bu alanin yerine gecmiyor. `docs/privacy.html`
git'te tutulur (GitHub Pages depodan yayinlar) ve elle duzenlenmez.

Amblem/ad kullanimina iliskin feragat `settings.legalMarks` icinde. Ayni ifade
App Store aciklamasinda da bulunmali; saglayici sozlesmesi amblem haklarinin
sorumlulugunu tumuyle bize birakiyor.

## Notlar

- `ios/` ve `android/` uretilen klasorlerdir, git'te tutulmaz (`expo prebuild`).
- Ucretsiz Apple hesabi kullaniliyor: push yetkisi yok (bkz.
  `plugins/withoutPushEntitlement.js`) ve cihaza kurulan uygulama 7 gunde
  suresi doler, sonrasinda `npm run dev:phone` ile yeniden kurulmasi gerekir.
- Gorseller bulanik gorunuyorsa iki bilinen sebep var. Birincisi: reanimated
  giris animasyonlarinda `rotate`/`scale` kullanmak, animasyon sirasinda
  yuklenen gorselleri kalici olarak yumusatiyor (bkz. `src/lib/animations.ts`).
  Ikincisi: `expo-image` gorseli gorunum boyutuna indirger ve bu bitmap'i URL
  ile onbelleklerse, ayni gorsel baska bir boyutta cizildiginde eski bitmap
  olceklenir; kucuk rozetlerde `allowDownscaling={false}` kullanilir.
- Arama yaparken `src/lib/search.ts` kullanilmali: saglayici verisi Turkce
  karakterlerde tutarsiz ("Fenerbahce" / "Fenerbahçe") ve yarisma adlari
  ingilizce kayitli ("UEFA Europa League"), bu yuzden ham `includes` yetmez.
- Live Activity modulu (`modules/live-activity`) yalnizca iOS derlemelerinde
  vardir; Expo Go ve web'de `null` doner.
