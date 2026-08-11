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

## Yayin derlemesi

`eas.json` uc profil tanimlar. Production profili `APP_ENV=production` verir;
`app.config.js` buna bakip yerel ag izinlerini, Metro adresi eklentisini ve push
entitlement kaldirmasini devre disi birakir.

```bash
npx eas build -p ios --profile production
```

Ilk kullanimdan once yapilmasi gerekenler (Expo hesabi girisi ister, bu yuzden
elle):

- `npx eas init` -- `projectId` ve `updates.url` degerlerini yazar; expo-updates
  bunlar olmadan calismaz.
- `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` degerleri EAS
  ortam degiskeni olarak tanimlanmali: `.env` git'te tutulmadigi icin bulut
  derlemesine kendiliginden gitmez.

`expo-updates` yayindan sonra JS duzeltmesini App Store incelemesini beklemeden
gondermek icindir. `runtimeVersion` politikasi `fingerprint`: native bagimliliklar
degisince runtime kimligi de degisir, boylece uyumsuz bir paket eski derlemeye
gonderilemez. Yalnizca JS/varlik degisiklikleri boyle gonderilebilir; native
degisiklik yeni bir derleme gerektirir.

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

## Fikstur kaynaklari

Sira `src/services/providers/index.ts` icinde: **ESPN birincil**, TheSportsDB
yedek. TheSportsDB'nin ucretsiz katmani eksik veriyor (Avrupa kupalarinin eleme
turlarini hic dondurmuyor); ESPN resmi olmayan bir API oldugu icin de tek basina
birakilmiyor.

ESPN eleme turunu bagimsiz bir lig sayar: `uefa.europa` bos donerken maclar
`uefa.europa_qual` altindadir. Lig satirindaki `external_ids.espnQualifying` bu
ikinci kodu tasir, saglayici ikisini birlikte okur.

Bir maci iki kaynaktan almak iki kayit uretir: `upsert_event` once saglayicinin
kendi kimligine, bulamazsa "ayni spor + ayni iki takim + ayni gun" olcutune bakar
(bkz. migration 0035). Takim adlari kaynaklar arasinda farkliysa (`AGF` /
`AGF Aarhus`) bu olcut de tutmaz, o yuzden tek kaynakta durulur.

Cift kayit ararken **ayni lig + ayni saat yeterli degildir**: Konferans Ligi'nde
ayni saatte 8 mac oynanir. Ev sahibi ayni olmali. Takim adlarinda "biri digerini
iceriyor" testi de yanlis eslesir: `Angers` ⊂ `Queens Park Rangers`.

Turkce takim adlari icin lig `external_ids.wikipedia` ile tr.wikipedia sezon
makalesine baglanir ("Süper Lig" -> "2026-27 Süper Lig"); saglayicilarin hicbiri
adlari dogru yazmiyor. Yeniden adlandirma kurali migration 0037'de: yalnizca
sadelestirmeyle ayni kulup oldugu dogrulanmis ve mevcut ad duz ASCII iken
aksanli yazilis kabul edilir.

Senkron fonksiyonlari ligleri parcalara boler ve her cagride bir parca isler
(`sync-events` 8, `sync-teams` 4). Elle tetiklerken hepsini dolasmak gerekir:

Sir ekrana yazilmadan, cron kaydinin komutu oldugu gibi calistirilir. Token'i
regex ile ayiklamaya calismak yanlis: hex degil, `Bearer ([a-f0-9]+)` gibi bir
kalip yalnizca bir parcasini yakalar ve istek `UNAUTHORIZED_INVALID_JWT_FORMAT`
ile doner.

```sql
do $$ declare cmd text; i int; begin
  select command into cmd from cron.job where jobid = 1;  -- 1: sync-events
  for i in 0..7 loop
    execute replace(cmd, '/sync-events', '/sync-events?chunk=' || i);
    perform pg_sleep(2);
  end loop;
end $$;
```

Baska bir isi ayni sirla tetiklemek icin adres degistirilir:
`execute replace(cmd, 'sync-events', 'sync-broadcasts')`.

Yanit `net._http_response` icinde birikir:
`select status_code, content from net._http_response order by created desc limit 1;`

## Yayin kanallari

Iki katman var. `league_channels` lig basina sabit esleme yapar (varsayim),
`event_broadcasts` mac bazinda yazar ve varsa lig eslemesini **gecersiz kilar**
(bkz. `useUpcomingEvents`). Ikinci katman bugune kadar bostu, yani kanal bilgisi
tumuyle varsayimdi ve Turk takimlarinin Avrupa maclarinda yaniliyordu: yayin
hakki lig genelinde TRT'de olsa da o maclar TV100'de yayinlandi.

Kaynak `src/services/providers/sporekrani.ts`: sayfanin sunucu tarafinda gomdugu
`__INITIAL_STATE__` icinde gunun butun yayinlari duruyor. `sync-broadcasts` isi
bunu okuyup `set_event_broadcast` (migration 0039) ile yaziyor; eslestirme
veritabaninda cunku ad sadelestirmesi orada.

Denenip elenen kaynaklar -- tekrar aranmasin diye: Nesine bulteninde yayin alani
var ama tum maclarda bos, iddaa yayin bilgisi tasimiyor, Sofascore 403,
FotMob uc noktasi kapali, apifootball ve TheSportsDB'de yayin verisi hic yok.
Ucretli secenekler Sportmonks (29 EUR/ay, TV verisi tum planlarda) ve Broadage
(cok sporlu, ozel fiyat).

Iki bilinen sinir:

- Kaynak yalnizca icinde bulunulan gunu veriyor. Tarih parametresi, tarih bazli
  adres ve API uc noktasi denendi, hepsi ayni gunu donduruyor.
- Eslestirme tam ad esitligine dayanir. Kaynak Turkce yaziyor ("Dinamo Kiev",
  "Karabağ"), katalog ozgun yazimi tutuyor ("Dynamo Kyiv", "FK Qarabag"); bu
  ciftler eslesmiyor. Trigram benzerligi cozmuyor: dogru cift 0.26 verirken
  alakasiz bir cift (Angers / Queens Park Rangers) 0.23 veriyor.

Ayrica kaynak yalnizca Turkiye'de yayinlanan maclari listeliyor. Yayinlanmayan
bir mac icin lig eslemesi devreye girip yanlis kanal gosterir; bugun katalogdaki
40 Avrupa macindan yalnizca 2'si Turkiye'de yayinlaniyordu.

## Notlar

- `ios/` ve `android/` uretilen klasorlerdir, git'te tutulmaz (`expo prebuild`).
- Yeni bir expo paketi eklerken **ikili uyumluluk** kontrol edilmeli.
  `expo-file-system@57.0.2` kurulunca uygulama acilir acilmaz cokuyordu:
  `DYLD Symbol missing: _$s15ExpoModulesCore10BaseModuleC11willDestroyyyFTj`.
  Paket, projedeki `expo-modules-core` surumunde bulunmayan bir sembol
  bekliyordu; `devicectl` "Launched" dese de surec listede gorunmuyordu.
  Cozum paketi uyumlu surume (57.0.0) sabitlemek oldu. `npx expo install --fix`
  bir cozum degil: react-native dahil 24 paketi birden guncellemeye kalkip
  yarida hata veriyor. Cokme sebebi su sekilde okunur:

  ```bash
  idevicecrashreport -e /tmp/crashes     # cihazdaki raporlari indirir
  # .ips dosyasinin ilk satiri atlanip govdesi JSON olarak okunur:
  #   termination.reasons -> "Symbol not found: ..."
  ```
- Yeni bir Edge Function cron'dan cagrilacaksa `supabase/config.toml` icine
  `verify_jwt = false` eklenmeli; yoksa platformun JWT kapisi istegi fonksiyona
  hic ulastirmadan `UNAUTHORIZED_INVALID_JWT_FORMAT` doner. Isler paylasilan
  `SYNC_SECRET` ile korunur, kullanici JWT'siyle degil.
- Giris animasyonu kaldirildi: reanimated'in `entering` animasyonu listenin ilk
  kartlarinda yarida kaliyordu ve bedeli gorunur bozukluk oluyordu (once
  `opacity: 0`'da asili kalan kartlar, sonra 24 piksel kaymis duranlar). Sebep
  bulunamadi; `index` proplari yerinde durdugu icin guvenilir bir animasyon
  ileride geri getirilebilir.
- Geri sayimlar `useNow()` ile paylasilan saatten beslenir (`src/lib/now.tsx`).
  Yeni bir sure gosterimi eklerken oraya baglanmali: aksi halde deger ilk
  cizimde donar ve ekran acik beklerken bayatlar.
- Ucretsiz Apple hesabi kullaniliyor: push yetkisi yok (bkz.
  `plugins/withoutPushEntitlement.js`) ve cihaza kurulan uygulama 7 gunde
  suresi doler, sonrasinda `npm run dev:phone` ile yeniden kurulmasi gerekir.
- Gorseller bulanik gorunuyorsa iki bilinen sebep var. Birincisi: reanimated
  giris animasyonlarinda `rotate`/`scale` kullanmak, animasyon sirasinda
  yuklenen gorselleri kalici olarak yumusatiyordu; animasyon artik yok ama geri
  getirilirse bu ikisinden kacinilmali. Ikincisi: `expo-image` gorseli gorunum
  boyutuna indirger ve bu bitmap'i URL
  ile onbelleklerse, ayni gorsel baska bir boyutta cizildiginde eski bitmap
  olceklenir; kucuk rozetlerde `allowDownscaling={false}` kullanilir.
- Arama yaparken `src/lib/search.ts` kullanilmali: saglayici verisi Turkce
  karakterlerde tutarsiz ("Fenerbahce" / "Fenerbahçe") ve yarisma adlari
  ingilizce kayitli ("UEFA Europa League"), bu yuzden ham `includes` yetmez.
- Live Activity modulu (`modules/live-activity`) yalnizca iOS derlemelerinde
  vardir; Expo Go ve web'de `null` doner.
