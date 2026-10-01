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

### Hangi surumde gelistirilir

Telefonda iki uygulama yan yana duruyor ve ikisi **ayri paket kimligi**
kullaniyor (`app.config.js` icindeki `APP_VARIANT`):

| | `npm run dev:phone` | `npm run release:phone` |
|---|---|---|
| Uygulama | "sportpulse dev" | "sportpulse" |
| JS degisikligi | Metro uzerinden **aninda** | 4-5 dakika tam derleme |
| Metro gerekir | evet (Mac acik) | hayir |
| Hatalar | LogBox'ta gorunur | gizli |

Gelistirme dev surumunde yapilmali. JS-only degisiklikler (ekran, sorgu, metin)
icin yeniden derleme gerekmez; yalnizca native bagimlilik eklendiginde gerekir.
Release surumu gunluk kullanim icindir: JS gomulu geldigi icin Mac kapaliyken de
acilir.

Iki paket kimligi ayri oturum deposu demek: dev surumunde yapilan giris release
tarafinda gorunmez. Dev icin `dev@sportpulse.app` hesabi var; sifresi
unutulursa yenisi boyle verilir (takip ve favoriler de kopyalanmali, aksi halde
liste bos gorunur ve test ise yaramaz):

```sql
update auth.users
   set encrypted_password = crypt('<yeni-sifre>', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'dev@sportpulse.app';
```

Iki surumun verisi ayridir: dev tarafinda yildizlanan takim release'de
gorunmez. Test icin bu iyi -- kullanicinin listesi bozulmadan denenebilir.

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

Dev surumunun paket kimligi farkli oldugu icin **ayri bir profil** ister; o da
ayni sekilde yenilenir (workspace ve scheme `sportpulsedev`). Iki surum de
kullaniliyorsa ikisinin profili de yenilenmeli ve telefonda ikisine de guven
verilmeli.

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
node --test src/features/events/lib/league-banner.test.mjs
```

Armalı kartta banner secimi
`leagueBanner(leagueName, leagueArtworkUrl, leagueBadgeUrl, sportId)` ile hem
ana ekran hem etkinlik detayinda yapilir. Gomulu UEFA gorselleri onceliklidir.
Serie A ve Eredivisie'nin kullanicinin begendigi gorselleri yalnizca
`REVIEWED_ARTWORK` icindeki onayli URL ile eslesiyorsa korunur. Diger liglerde
rastgele fanart kullanilmaz: `MatchupArt`, lig logosunu filigran olarak ayni
geometrik desen ve lige uygun renklerle cizer. Logo da yoksa renk gecisi kalir.
`artwork_url` alaninin dolu olmasi gorselin lige ait temiz bir afis oldugunu
kanitlamaz; bazi kaynak gorsellerinde takim/oyuncu fotograflari vardir.
Lig filigranlarinda `tintColor` kullanilmaz: opak Bundesliga rozeti duz bir
kareye donusuyordu. Orijinal renkler dusuk opacity ile korunur. Dekoratif
cizgiler `MatchupArt` sinirlari icinde `overflow: hidden` ile kirpilir; aksi
halde donmus seritler alttaki saat/kanal alanina tasar.

## Yayin derlemesi

`eas.json` uc profil tanimlar. Production profili `APP_ENV=production` verir;
`app.config.js` buna bakip yerel ag izinlerini, Metro adresi eklentisini ve push
entitlement kaldirmasini devre disi birakir.

```bash
npx eas build -p ios --profile production
```

EAS projesi `@rljer/sportpulse` (`extra.eas.projectId` ve `updates.url`
app.json'da). EAS komutlari `EXPO_TOKEN` ortam degiskeniyle giris yapar;
`eas login` gerekmez. Devin oturumlarinda token repo secret'i
`SPORTPULSE_EXPO_TOKEN` olarak durur ve komuta `EXPO_TOKEN` adiyla baglanir.

`EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` degerleri EAS
ortam degiskeni olarak tanimlanmali: `.env` git'te tutulmadigi icin bulut
derlemesine ve `eas update` paketine kendiliginden gitmez.

### OTA guncelleme (eas update)

`expo-updates` JS/varlik degisikligini yeniden derleme olmadan telefona
gondermek icindir. Kanal `production` (`updates.requestHeaders` icinde
sabit; yerel `npm run release:phone` derlemesi de bu kanali kullanir, EAS
production derlemesi de). Dev surumu (Debug) Metro'dan beslendigi icin
guncelleme almaz; guncellemeler gunluk kullanilan "sportpulse" surumuna gider.

```bash
npx eas update --channel production --environment production --message "<ozet>"
```

Uygulama guncellemeyi acilista indirir ve **bir sonraki acilista** calistirir
(`fallbackToCacheTimeout: 0`). `runtimeVersion` sabit bir dizedir (`"1.0.0"`);
guncelleme yalnizca ayni runtime ile derlenmis uygulamaya gider. Native
bagimlilik eklenince, kaldirilinca veya app config'in native tarafi
degisince bu dize **elle** yukseltilmeli (`1.0.0` -> `1.1.0`) ve telefonda
yeniden derleme yapilmali (`npm run release:phone`); aksi halde eski derleme
uyumsuz JS alir ve acilista coker.

`fingerprint` politikasi kullanilmaz: fingerprint `ios/` klasorunu de
hash'ler, klasor Mac'te var (prebuild ciktisi, git'te degil) bulutta yok, bu
yuzden telefondaki derleme ile `eas update`'in runtime kimligi hicbir zaman
tutmuyordu ve guncellemeler sessizce yok sayiliyordu.

Yeniden derlemeden sonra (`npm run release:phone`) yeni bir `eas update`
atilmali: expo-updates, gomulu paketten **daha eski** tarihli guncellemeyi
almaz. Derlemeden once yayinlanmis update sunucuda dursa bile telefon
`NoUpdateAvailable` der ve gomulu surumde kalir.

Telefonda hangi paketin calistigi Ayarlar'in en altindaki satirda gorunur
(`guncelleme <tarih> · <id>` ya da `gomulu surum`).

Yayinlanan guncellemeler ve hedef runtime:
`https://expo.dev/accounts/rljer/projects/sportpulse/updates`.

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

`net.http_post` varsayilan olarak 5 sn bekler; senkron yanitini gormek icin
zaman asimi artirilir. Sir yazdirilmadan DO blogunda `[^']+` ile alinir
(hex kalibi kullanilmaz, yukaridaki not):

```sql
do $$ declare tok text; begin
  select substring(command from 'Bearer ([^'']+)') into tok from cron.job where jobid = 6;
  perform net.http_post(url := 'https://vyqkpnhhjjbvcprdncnx.supabase.co/functions/v1/sync-bsd-football',
    headers := jsonb_build_object('Authorization', 'Bearer ' || tok), timeout_milliseconds := 170000);
end $$;
```

Uzak veritabaninda SQL calistirmak icin MCP gerekmez:
`npx supabase db query --linked -f dosya.sql` (`--output-format json` ile
makine okunur). `supabase_migrations.schema_migrations` yereldeki numaralarla
senkron degil; 0066-0067 dogrudan SQL ile uygulandi, 0068-0070 elle
`20261001120068..70` surumleriyle kaydedildi.

### Kopya takim ve mac birlestirme (0068-0070, 1 Ekim 2026)

- **Kopyalar silinmez, isaretlenir.** `teams.merged_into_team_id` ve
  `events.merged_into_event_id` asil kaydi gosterir; kopyanin saglayici
  kimlikleri bosaltilir (unique index'ler yuzunden once kopya birakir, sonra
  asil alir). Denetim: `team_merges`, `event_merges`. Yedek:
  `backup_2026_10_01_*`. Geri donus: `supabase/rollback/0068_0070_rollback.sql`.
- **Uygulama sorgulari** `merged_into_event_id is null` /
  `merged_into_team_id is null` filtresi kullanir; `fetchEvent`/`fetchTeam`
  birlesmis kimlige gelirse asil kayda yonlenir (eski bildirim/baglanti).
- **Kopya takim kaniti isimle degil:** ayni lig + ayni saat + ayni rakip + ayni
  taraf, ya da ortak saglayici kimligi. Ayni saglayicida farkli kimlik tasiyan
  cift ayni kulup DEGILDIR (yanlis takima baglanmis tekil maclar: AS Roma /
  RB Leipzig). Kopyanin adi asil kaydin alias'i olur.
- **Takim cozumleme tek yerde:** `resolve_team()` -- saglayici kimligi > ad >
  `team_name_aliases`, birlesmis satirlar haric, birden cok aday varsa bsd ve
  kimlik sayisi belirler. `upsert_event` ve `upsert_team` bunu kullanir.
- **Mac eslestirme** `same_match()` = `dedupe-events.ts` kurali. `upsert_event`
  aday mac ayni kaynaktan baska kimlik tasiyorsa baglamaz; **bsd kimligi olan
  macta baska kaynak saati/basligi/durumu/takimlari ezmez** (iki kaynak saati
  birbirinin ustune yaziyor ve her seferinde "saat degisti" bildirimi
  uretiyordu).
- **Sonuclar** `set_event_results(jsonb)` ile yazilir: mevcut satiri id ile
  gunceller, `finished`i geri almaz, null skor mevcudu silmez.
  `events.upsert([{id, home_score, ...}])` KULLANILMAZ: INSERT ... ON CONFLICT
  eksik NOT NULL kolonlarda (`sport_id`) 23502 ile duser; 20-30 Eylul arasi
  hicbir skor bu yuzden yazilmadi. `events.status` hala yalnizca
  scheduled/postponed/cancelled; sonuc `home_score/away_score/result_status`.
- `sync-bsd-football` ligleri en uzun suredir denenmeyenden baslar ve 110 sn
  sonra yeni lige baslamaz; eskiden sabit sira sondaki ligleri (Trendyol 1.
  Lig) hic islemiyordu.
- **ESPN**: Supabase IP'lerine 403 (hala). Ayrica 1 Ekim 2026'da futbol ve
  basketbol scoreboard'lari tarih ARALIGINI 400 ile reddediyor, tek gun
  calisiyor; saglayici 400'de gun gun sorar. Gecmis ESPN sonuclari icin
  yerelden: `node scripts/backfill-espn-results.mjs [--dry-run]`.
- Sonucu eksik maclar: `select * from events_missing_result(1000);`.

## Saglayici sagligi ve canli skor denemesi

`sync-events` ve `sync-rankings`, ESPN/TheSportsDB HTTP ve ag hatalarini
`provider_issues` tablosuna istek sirasinda kaydeder. Tablo istemci rollerine
kapalidir; yonetici SQL sorgusuyla okunur. Ayni kaynak/lig/hata bir calismada
tek kayda indirilir. URL, API anahtari ve yanit govdesi kaydedilmez.

```sql
select job, source, kind, http_status, league_id, observed_at
from public.provider_issues
order by observed_at desc limit 30;
```

Senkron yanitinda `runId`, `providerIssues`, `diagnosticsPersisted` ve
`status` bulunur. Yedekten fikstur gelmesi hatalari silmez (`degraded`).
Siralama tamamen basarisizsa HTTP 502 / `failed` doner. Cron'un `succeeded`
demesi yalnizca SQL komutunun calistigini gosterir; Edge Function basarisini
kanitlamaz. `net._http_response` zaman asimi da tek basina Edge Function'in
sonlandigini kanitlamaz. 14 Eylul 2026'da Supabase'den ESPN 403'u olculdu;
IP engeli oldugu kesinlestirilmedi. Toplu kura yazimi bu 403'u cozmez.
Hata kayitlari icin henuz otomatik saklama-suresi temizligi yoktur.

Lig bazindaki `fixture_sync_health` tablosu oturum acmis kullanicilara salt
okunur durum bilgisi verir. `begin_fixture_sync` uc dakikalik is kilidi alir;
ayni lig icin ikinci eszamanli is baslamaz. Tamamlanan fikstur asamasi kendi
kontrol noktasini yazar; sonraki kura/sezon islemi takilsa da bu kayit kalir.
Basarisiz veya sinirli kaynak guncellemesi `last_success_at` alanini ilerletmez.
TheSportsDB ucretsiz veri `limited`, kaynak hatasiyla gelen kismi veri
`degraded`, basarisiz is `failed`, dogru sekilde donmus bos birincil yanit
`empty` olarak ayrilir. Bu durumlar kaynagin gercek dunyadaki tum maclari
kapsadigina dair bir garanti degildir.

`sync-events?leagueId=<uuid>` tek ligi tekrar denemek icindir ve mevcut
SYNC_SECRET kontrolune tabidir. Varsayilan cron degismedi; parca icinde en
eski denenen lig onceliklidir. 110 saniyeden sonra yeni lige baslanmaz;
`deferredLeagues` sonraya birakilanlari bildirir. Ag istekleri govde dahil
10 saniyeyle sinirli; ag/502/503/504 hatalari bir kez yeniden denenir. 403
tekrarlanmaz. Uzun Retry-After yanitinda veya gun taramasindaki kalici hatada
TheSportsDB taramasi durur; daha once toplanan veri tam pencere sayilmaz.
Basarisiz sezon sorgusu mevcut sezon tarihlerini bosaltmaz.

`FixtureHealthNotice` ana ekranda gosterilmez (kullanici istegiyle kaldirildi);
bilesen duruyor, `useFixtureHealth` yalnizca bos liste metnini secmek icin
kullanilir.

`FixtureHealthNotice`, takip edilen liglerin ve sporlarin,
takip edilen takimlarin lig uyeliklerinin ve favori sporcularin turlarinin
durumunu gosterir. Veri henuz olculmemisse, kisitliysa veya sekiz saati
gecmisse uyari verilir. Bu yalnizca veritabanindaki durumu okur, kullanici
istemcisi saglayici kotasini tuketecek senkron baslatamaz.

```bash
node --test src/services/providers/log.test.mjs src/features/events/lib/fixture-health.test.mjs
```

API-Sports/API-Football ile apifootball.com **farkli hizmetlerdir**.
Mevcut `API_FOOTBALL_KEY` apifootball.com icindir; yeni deneme icin
`API_SPORTS_FOOTBALL_KEY` kullanilir. Anahtar uygulamaya gomulmez ve
`EXPO_PUBLIC_` olarak tanimlanmaz. Gizli ortam degiskeni hazir oldugunda:

```bash
node scripts/check-live-scores.mjs
node --test src/services/providers/log.test.mjs src/services/providers/api-sports-live.test.mjs
```

Canli skor deneme komutu her calistirmada yalnizca bir `fixtures?live=all`
istegi atar; otomatik yenileme, cron, ucretli plan veya uygulama entegrasyonu
yoktur. Kaynagin kalan gunluk kotasini gosterir. 14 Eylul 2026'da yerelde
34 canli mac alindi. Ayni gun 16:48 UTC'de Supabase Edge Function'dan tek
istekle HTTP 200, 38 canli mac ve 97 kalan istek dogrulandi. Anahtar yalnizca
Edge Function secret olarak okunmustur. Test icin `sync-events` icine eklenen
korumali gecici kontrol yolu test sonunda kaldirildi ve tekrar deploy edildi.
Ucretsiz planda gunluk 100 istek vardir. `leagues` katalogu Süper Lig 2026'yi
listelese de sezon filtreli `fixtures` istegi ucretsiz planin yalnizca
2022-2024'e izin verdigini soyledi. `live=all` calisiyor; ancak sunucu
orneginde Süper Lig maci yoktu. Süper Lig oynanirken canli akis kapsam testi
halen gerekli; katalogda bulunmasi mac erisimini kanitlamaz.

14 Eylul 2026'da Supabase'den `fixtures?date=2026-09-17` sorgusu da denendi:
API-Sports ucretsiz plan yalnizca 2026-09-13..2026-09-15 tarihlerini kabul
ediyordu. Bu plan haftalik ileri tarih fiksturu icin yeterli degildir.
Mevcut apifootball.com anahtariyla ayni gunun `get_events` sorgusu 404 hata
nesnesi dondurdu. TheSportsDB'nin 17 Eylul / 4481 gunluk sorgusunda uc mac
vardi, Besiktas-Marsilya yoktu; ESPN ayni maci yerelden donduruyordu.
Gecici erisim testi kodu testten sonra kaldirildi ve sync-events yeniden
dagitildi. Ucretli plana gecis veya kaynak degisikligi kullanici karari bekler.

## Yayin kanallari

Iki veri katmani var. `league_channels` lig basina sabit esleme (varsayim),
`event_broadcasts` mac bazinda yazar ve varsa lig eslemesini **gecersiz kilar**
(cozum `resolveEventChannels` icinde). `broadcast_coverage` ise ucuncu katman:
"bu gun bu kaynak gercekten tarandi" kaydi tutar.

Iki kaynak besler:

- **`sync-broadcasts-bsd`** (cron: `25 */2 * * *`): BSD'nin
  `GET /broadcasts/?country_code=TR` ucu mac bazinda kanal verir ve maclar
  `external_ids.bsd` uzerinden **kimlikle** eslesir, ad tahmini yok. Pencere
  bugunden 3 gun sonrasina, sayfalama destekli. Futbol `coverage` gunlerini
  `sport_id='football'` olarak isaretler; kanal kayitlari `country_code='TR'`
  + ad ile upsert edilir.
- **`sync-broadcasts`** (cron: `10 */4 * * *`): sporekrani gunun TR akisini
  `__INITIAL_STATE__` icinden okur, `set_event_broadcast` ile takim adi
  eslemesi yapar. Yalnizca icinde bulunulan gunu verir; `sport_id=''`
  (tum sporlar) kapsama yazar.

`broadcast_coverage`'nin cozum anlami: gun **kapsanmamis** ise `league_channels`
yedek olarak gosterilir; gun kapsanip mac listede **yoksa** lig varsayimi
bastirilir ve kanal gosterilmez (yanlis bilgi yerine hic bilgi). Spor boyutu
sayesinde BSD futbol kapsamasi F1, basketbol vb. kanallari bastrimaz;
F1/F2 `league_channels` eslemesi her zaman otorite kalir.

BSD kaynagi olmadan kalan sinirlar sporekrani icin gecerli: yalnizca bugun,
tam-ad esitligi, yalnizca TR'de yayinlanan maclar listelenir. Denenip elenen
kaynaklar: Nesine bulteni (yayin alani bos), iddaa (tasimiyor), Sofascore 403,
FotMob kapali, apifootball ve TheSportsDB'de yayin verisi yok. Ucretli:
Sportmonks 29 EUR/ay, Broadage ozel fiyat.

BSD ilk calistirmasinda Turkiye-Fransa -> ATV, Turkiye-Italya -> ATV, Uluslar
Ligi diger maclari -> A Spor yazdi ve ulusal takimlar icin ilk kez
"lig varsayimi degil gercek kanal" geldi.

## Ucretsiz/veri kaynagi arastirmasi (21 Eylul 2026)

Futbol icin en guclu iki yeni aday, gercek anahtarla A/B testi bekliyor:

- **BSD / Bzzoiro Sports Data**: ucretsiz futbol REST, belgelenen kota
  7.500/gun. 2026/27 Trendyol Super Lig icin kendi olculu coverage sayfasi
  54 oynanmis macta timeline, kadro, mac istatistigi, shotmap, momentum ve
  ortalama pozisyonu %100 bildiriyor. Fikstur, live, lineup, incident ayri
  endpointler. Lisans; uygulamada gosterme ve ic saklamaya izin veriyor, ham
  dataset/feed/API olarak yeniden dagitimi yasakliyor. Ancak servis genc;
  kamuya acik status son 90 gunde ~%99–99.94 ve changelog gecmiste OOM
  restartlari bildiriyor. Pazarlama iddiasi gercek Besiktas/Super Lig/UEL
  istekleriyle sinanmadan birincil yapilmayacak. **21 Eylul gercek test:**
  Supabase secret adi `API_BSD_FOOTBALL_KEY`; server-side istek HTTP 200.
  20 Eylul–20 Ekim Besiktas aramasinda 4 mac dondu: Amed (bitmis 3-2),
  Besiktas–Kocaelispor, Hoffenheim–Besiktas UEL ve Trabzonspor–Besiktas.
  Amed maci lineup endpointi `confirmed`: 11+10 ev, 11+10 deplasman,
  dizilisler 4-2-3-1 / 4-1-4-1. Incidents endpointi 33 olay (gol, kart,
  degisiklik, VAR, injury time) dondurdu. Probe testten sonra 410'a kapatildi.
  Not: `unavailable_players` listesi ilk 11/yedekle celisen oyuncular tasiyordu;
  bu alan kullanilacaksa ayri kalite kontrolu gerekli.
- **GOAL API**: ucretsiz 1.000 istek/gun; servis, veriyi ucuncu taraflardan
  lisansladigini soyluyor. Canli skor, ileri fikstur, lineup, event endpointleri
  ayni free planda. Kamuya acik Super Lig coverage: 1.811 mac, 40 ileri mac,
  1.792 lineup, 1.369 olay zaman cizelgesi. Uptime endpointinde Football Data
  son 24s %99.983, genel API %98.385. Servis ve SDK'lar 2026 yazinda yeni;
  anahtarla ayni maclar uzerinde BSD/API-Sports'a karsi olculmeli.

Diger futbol adaylari:

- football-data.org free: 12 turnuva (5 buyuk lig + UCL vb.), Super Lig yok,
  skorlar gecikmeli. Buyuk lig fiksturu icin yedek olabilir.
- Footballdata.io free: World Cup, PL, LaLiga, UCL, UEL; Super Lig yalniz Pro.
- OpenFoot beta: 5.000/ay free fikstur iddiasi var, fakat 20 Eylul testinde
  `comp_super_lig_tr` 2026/27 scheduled bos dondu. Diger verilerinin bir kismi
  unlicensed-beta FotMob kaynagiyla etiketli; birincil sayilmaz.
- SportScore: anahtarsiz ~10.000/gun ve Besiktas'in Super Lig + UEL ileri
  maclarini donduruyor. Uzak lig tarihlerinin bazisi varsayilan hafta/saat
  gorunuyor; kesin kickoff sayilmaz. Free sart her veri gosteren yuzeyde
  gorunur **dofollow HTML link**; native uygulamaya dogrudan uymuyor, yazili
  izin/ozel lisans olmadan entegre edilmemeli.
- TFF scraper/datafc: resmi TFF sayfasindan tam lig fiksturu ve mac sayfasindan
  11+11 kadro alabiliyor. Teknik olarak Windows-1254 ASP.NET, Chrome TLS
  impersonation, cache/rate limit gerektiriyor. TFF kullanim sartlari kaynak
  gosterilerek yayinlamaya izin veriyor fakat **ticari kullanimi acikca
  yasakliyor**. Kisisel validator olabilir; kullanicili urunun veri omurgasi
  yapilmayacak.
- FotMob/Sofascore wrapperlari: toplulukta yaygin ve cok zengin; ikisinin de
  resmi public API'si yok. FotMob ToS otomatik retrieval/scraping'i acikca
  yasakliyor ve bir acik kaynak projeye kaldirma bildirimi gondermis. Sofascore
  resmi FAQ, veri saglayici sozlesmeleri nedeniyle API sunmadigini soyluyor;
  WAF/TLS fingerprint 403 ve agresif rate limit var. Uretim kaynagi yapilmaz.

Futbol disi:

- Live Tennis API free: ATP/WTA/Challenger/ITF canli + yaklasan fikstur/skor,
  fiyat sayfasina gore 100 istek/gun. Gecmis sonuc, ranking ve detayli olaylar
  ucretli; server cache ve seyrek polling sart.
- Jolpica F1: takvim/sonuc icin 500 istek/saat, CC BY-NC-SA ve ticari olmayan
  kullanim. OpenF1 gecmis telemetry ucretsiz (3 req/s, 30/dk) fakat canli veri
  €9.90/ay sponsor paketi ve yine non-commercial lisans. Ticari buyumede lisans
  gorusmesi gerekir.
- MotoGP PulseLive: anahtarsiz, gayriresmi wrapperlari var; takvim, session,
  classification ve standings. Dorna/MotoGP ile baglantili resmi urun degil,
  wrapperlar veriyi personal/research diye tanimliyor; lisans testi olmadan
  ticari omurga yapilmaz.
- UFC: topluluk REST servisleri ve ufc.com JSON:API/ufcstats kaynaklari var;
  takvim/fight card icin deneysel yedek olabilir, haklar ve stabilite ayrica
  dogrulanmali.

**Uygulanan zincir (21-22 Eylul):** `sync-bsd-football`, BSD → GOAL zincirini
sezon basindan (1 Temmuz) 30 gun ileriye kadar uygulamadaki 22 futbol liginde
calistirir. BSD_IDS 21 ligi kapsar; Trendyol 1. Lig BSD'de yok, GOAL-only
(`goal` kaynagiyla `ok`, 110 mac). Ligler 4'lu isci havuzuyla paralel islenir —
tek cagri sirayla duvar saati siniri asiyordu; skorlar da mac basina ikinci
yazim yerine tek `events.upsert` ile toplu guncellenir. Sezonu baslamayan
organizasyonlar (orn. Dünya Kupasi Elemeleri – Avrupa, Coupe de France) hem
BSD'de hem GOAL'da bos doner ve `empty` kalir — hata degil. GOAL `limit` tavani
100'dur ve `offset`+`pagination.hasMore` ile sayfalanir; 200 gondermek 400
verir (BSD hic devreden cikmadigi icin bu hata uzun sure gorunmez kalmisti).
`upsert_event` kimligini kullanir; lig satirlarina `external_ids.bsd` de yazilir
(diger BSD uclari lig adini bundan cozer). BSD takim logolari
`img/team/{id}/` olarak event yaziminda gonderilir. Gercek sayilar (22:40 kosu):
UECL 276, UCL 147, UEL 118, Nations League 104, LaLiga 92, Eredivisie 82,
Carabao 77, Super Lig/Primeira 72, PL/Serie A 70, Ligue 1 63, Bundesliga 54,
DFB-Pokal 32, Coppa Italia 29, Hazirlik 27, Copa del Rey 20, Super Cup 1;
hepsi `ok` veya `empty`, issue 0.

Cron adi geriye uyumluluk icin `sync-bsd-football-every-6h` kaldi ama migration
0064 ile gercek schedule `10,40 * * * *`: legacy sync'in ESPN 403 health
sonucunu ezmesinden 10 dakika sonra guvenilir kaynak tekrar yazar. 10 lig x
48 kosu ve UECL'nin ikinci sayfasi BSD'nin 7.500/gun kotasinin cok altindadir;
GOAL yalnizca BSD hata/bos yanitinda cagrilir. Cron mevcut sync-events
Authorization basligini Postgres icinde yeniden kullanir; sir source code'a
yazilmaz.

`event-bsd-data` surum 1, BSD external id tasiyan etkinlikte `kind=lineup` veya
`kind=live` ceker ve mevcut lineup/live cache sekillerine normalize eder. Gercek
Amed–Besiktas cihaz testinde 21'er oyuncu (11+10), 31 olay, 3-2 ve FT cache'i
dogrulandi; mac merkezi kartinda goller/kartlar goruldu. Client once BSD'yi,
sonra GOAL/API-Sports/eski fallbackleri dener. BSD/GOAL provider anahtarlari
`API_BSD_FOOTBALL_KEY` ve `GOAL_API_KEY` olarak yalnizca Edge secrets'tadir.

### Takim sezon maclari ve skorlar

Migration 0061, reminder `events.status` kontratini bozmadan `home_score`,
`away_score`, `result_status` ekler. Guvenilir futbol sync'i 1 Temmuz'dan
30 gun ileriye kadar gecmis/gelecek maclari ve skorlari yazar. Takim sayfasi
kanonik takim id'siyle bu sezonu okur, `splitTeamSeasonEvents` yaklasanlari
artan; sonuclari azalan tarihle siralar. Sonuclar ve fikstur ayri sekmelerdir
(`results` varsayilan acilis sekmesi, son maclar ilk izlenimde gorunur). `TeamEventRow` buyuk EventCard yerine
kompakt lig+tarih+arma+skor/saat satiridir. Ayni gun/ayni ev-deplasman iki
provider satiri varsa `dedupeTeamEvents`, skor tasiyan BSD satirini secer.
Besiktas gercek testinde 24 gecmis + 3 gelecek, Besiktas–Marsilya 4-1 dahil.

Migration 0062, yalnizca logosu bos ve BSD id'si olan takima
`https://sports.bzzoiro.com/img/team/{id}/` yazar; mevcut resmi/Wikipedia
armalarina dokunmaz. Migration 0063 Amed/AMED uzun adi, Besiktas JK ve
Basaksehir FK BSD kimliklerini silmeden kanonik takimlara tasir, event ve
league membershipleri kanonik id'ye yonlendirir. Standings provider logosu
bos kalirsa `enrichTableLogos` katalog aramasiyla tamamlar. Super Lig ve UEL
membershiplerinde eksik logo sayisi 0; Amed PNG HTTP 200 ve cihaz puan
tablosunda goruntusu dogrulandi.

### Futbolcu profilleri

`player-bsd-data` Edge Function'i BSD'nin oyuncu uclarini canli cagirir:
`kind=search` (`/players/?name=`), `kind=profile` (`/players/{id}/` +
`/players/{id}/career/`) ve `kind=matches` (`/players/{id}/stats/?season_id=`,
mac mac log; `event_id` bizim `events.external_ids.bsd` ile eslenip mac
sayfasina baglanir). Profil boy, kilo, ayak, mevki, uyruk, dogum, piyasa
degeri, sozlesme ve sakatlik durumunu; career lig/takim basina mac, dakika,
gol, asist ve ortalama puan verir. Sezon etiketleri lig basina
`/leagues/{id}/seasons/` uzerinden cozulur ("2026/27", `is_current` BSD'den
gelir). Takim ve lig adlari `external_ids.bsd` eslesmelerinden, bulunamazsa
KNOWN_LEAGUES haritasindan okunur.

Takim kadrosu `team-squad` Edge Function'indan gelir: bizim `teams.id`'yi
alir, `external_ids.bsd` varsa BSD `squad/` ucuyla doner, yoksa
`external_ids.thesportsdb` ile `lookup_all_players`'a duser (basketbol ve
voleybol dahil). Satirin kendisi kimliksizse ayni kulubun baska ligdeki
kimlikli satirini arar — "Besiktas JK" (UEL) -> "Besiktas" (Super Lig);
katlama istemcideki `clubKey` ile ayni. Yalnizca `bsdId` tasiyan satirlar
futbolcu profiline gider. Istemci: `src/services/football-players.ts`
(`fetchTeamSquad`), ekran `src/app/(app)/football-player/[bsdId].tsx`, takim
sayfasinda `Kadro` sekmesi (takim sporlarinda hep gorunur), mac kadrosu
satirlari ve ana/arama ekranindaki futbolcu onerileri profile baglanir.

## Sezonluk motor sporlari yayinlari

2026 Turkiye haklari: Formula 1 ve Formula 2 seanslari `Bein Sports 4` ve
`TOD` uzerinden yayinlanir. Migration 0059 eski `TV8` / `TV8,5` sezon
eslemelerini bu iki kanala donusturur. F1/F2 mac-bazli `event_broadcasts`
kullanmaz: `resolveEventChannels` bu iki ligde `league_channels` eslemesini
otorite sayar ve gunluk futbol yayin tarayicisinin kapsama/override kaydinin
sezonluk hakki gizlemesine izin vermez.

```bash
node --test src/features/events/lib/broadcast-resolution.test.mjs
```

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

## Native tasarim dogrulamasi

Ana ekranin bagimsiz filtreleri ve tenis secimleri `calendar-view.ts` icinde
saf fonksiyonlarla test edilir:

```bash
node --test src/features/events/lib/calendar-view.test.mjs
```

`scripts/ui-test-entry.tsx` yalnizca test girisidir; `src/app` rotasi degildir,
normal uygulama paketinin giris agacina eklenmez. Gercek ekran bilesenlerini
ayri bir test navigatorunde calistirir. Uygulamanin asil auth/rota kabugunu veya
fiziksel iPhone'u dogrulamaz. Backend adresi test adresi degilse calismayi reddeder.
Tarayici testi tum API yanitlarini izole ornek verilerle karsilar:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://sportpulse-test.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=ui-test-placeholder npm run dev -- --port 8082
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9226 --user-data-dir=/tmp/sportpulse-ui-chrome --no-first-run --no-default-browser-check about:blank
node scripts/native-ui.test.mjs
```

Testler favori siniri, bagimsiz filtreler, tarih/kanal secimi, sporcu aramasi,
profil siralama tarihi, tenis elemeleri, sonuclarin uydurulmamasi ve ekran
genisliklerini kontrol eder. Gercek cihaz icin test Metro'sunu kapatip normal
`npm run dev -- --clear` acilmali; test sunucusu gunluk pakete kullanilmamali.

Canli skor ve tenis sonuc entegrasyonu henuz yoktur. Ilgili secimler bunu
acikca bildirir; gecmis baslangic saati canli/bitmis mac kaniti sayilmaz.
Lig bannerlari detay ekraninda korunur; ana takvim daha kucuk, gercek armali
kartlar kullanir. Favori kisayolu varsayilan iki macla sinirlidir ve normal
takvimden hicbir maci cikarmaz.

## Mac merkezi (skor + onemli anlar)

Bes buyuk lig icin (Premier League, LaLiga, Bundesliga, Serie A, Ligue 1)
mac detayinda FlashScore/Mackolik tarzi bir zaman cizelgesi: skor, dakika,
gol/kart/oyuncu degisikligi. Kaynak `src/services/providers/api-sports-fixture.ts`;
mevcut `API_SPORTS_FOOTBALL_KEY` sirrini kullanir, yeni anahtar gerekmez.

Bu bes lig disinda hicbir seye API-Sports lig kimligi tahmin edilmez:
yanlis lig kimligi baska bir macin skorunu sessizce baglar. `event-live`
Edge Function (henuz dagitilmadi) `events.leagues.name` alaninin
`APISPORTS_LEAGUE_IDS` icinde olmasini sart koyar, aksi halde `available:false`
doner. Fikstur eslestirmesi tarih + tam ad esitligiyle yapilir (AGENTS.md'nin
"Angers ⊂ Queens Park Rangers" uyarisi burada da gecerli: substring eslestirme
kullanilmaz). Eslenemeyen mac sessizce skor gostermez.

`live_cache`/`live_cached_at` (migration 0055) lineup_cache ile ayni desende:
mac bitince (`FINAL_STATUSES`) kayit sonsuza kadar kullanilir, mac surerken
(`LIVE_STATUSES`) 45 saniyelik kisa omurlu onbellek var. Istemci `useEventLive`
kickoff'tan +3 saate kadar 60 saniyede bir sorar, final durumda durur.

**Detay kartinda kaynak uzlasmasi:** `LiveMatchCard`, `event-live` detay
sonucunu toplu `live-scores` akisindaki eslesmeyle `resolveMatchCentre`
icinde birlestirir. Toplu akis maci canli raporluyorsa (BSD/ESPN kayitlari
yalnizca oynanan maclari tasir; API-Sports kaydi `LIVE_STATUSES`'ta ise)
detay ucunun bayat/`FT` gorunumlu onbellegi ezilir -- hicbir zaman "mac
oynanirken Mac sonu" yazilmaz. Skor once canli akis kaydindan, eksikse
detay ucutan alinir; olay zaman cizelgesi yalnizca detay ucunkudur
(uydurulmaz). "Mac sonu" etiketi yalnizca `FINAL_STATUSES`'ta gorunur;
ne canli ne final olan bilinmeyen durumlarda skor tek basina basilir.

```bash
node --test src/features/events/lib/match-events.test.mjs
```

**Dagitim durumu:** Migration ve fonksiyon 20 Eylul 2026'da MCP yazma
baglantisiyla dagitildi (`event-live`, surum 2, `ACTIVE`; Super Lig dahil). Supabase MCP'nin
`deploy_edge_function` araci fonksiyon klasorunun disina cikan `..` yollarini
kabul etmiyor (`../../../src/...` denemesi "Module not found" ile basarisiz
oldu); bu yuzden `supabase/functions/event-live/index.ts` **kendi icinde
bagimsizdir** -- diger fonksiyonlar gibi `src/services/providers/...`'a
referans vermez. Mantigin kaynagi hala `src/services/providers/api-sports-fixture.ts`
ve `src/features/events/lib/match-events.ts`; testler oradan calisir. Bu iki
kopya elle senkron tutulmali -- biri degisirse diger bilerek guncellenmeli.

### Ana ekrandaki "Canli" filtresi

Ayri bir ozellik: `event-live` tek bir macin tam olay zaman cizelgesini
cozer, `live-scores` (migration 0056, fonksiyon surum 1, `ACTIVE`) ise
`fixtures?live=all` ile **tum liglerdeki** canli maclari **tek istekte**
getirir. Ikisi ayni `API_SPORTS_FOOTBALL_KEY` sirrini kullanir ama farkli
amaclar icin: biri detay ekraninda olay listesi, digeri ana listede hangi
maclarin canli oldugunu isaretlemek icindir.

`live_scores_cache` tek satirlik paylasilan bir onbellektir -- her kullanicinin
"Canli" dugmesine basmasi ayri bir API-Sports istegi acmaz, hepsi ayni son
sonucu okur. Fonksiyon kendi TTL'i (45s) dolmadan yeni istek atmaz. Bu koruma
olmadan ucretsiz plandaki gunluk 100 istek dakikalar icinde tukenirdi.

Esleme `src/features/events/lib/live-match.ts`'te: bizim katalogdaki etkinlik
ile canli listedeki mac, **ev sahibi ve misafir takim adinin tam esitligiyle**
eslesir (noktalama/aksan farki tolere edilir), lig kimligi sarti yok --
`fixtures?live=all` zaten her ligi kapsiyor ve iki takim adinin da tam
eslesmesi yeterli ayirt edicilik sagliyor. Alt string/"iceriyor" eslesmesi
kullanilmaz (AGENTS.md'nin `Angers` ⊂ `Queens Park Rangers` uyarisi burada da
gecerli). Ad ile eslesen futbol kayitlari ayrica **baslangic saati
sapmasi <= 3 saat** sartina tabidir: ayni isimli iki fixture (ornegin sabah
bitmis kadin UNL maci ile aksam oynanan erkek maci) birbirine yapismaz;
saglayici kimligi (apisports/bsd) ile eslesenler bu kontrolden muaftir.

`useLiveScores` yalnizca kullanici filtreyi actiginda (veya futbol mac
detayi acikken) sorgu yapar ve acik kaldigi surece **45 saniyede bir**
yenilenir; istekler ayni TTL'li sunucu onbellegine dustugu icin ek kota
harcatmaz. Filtre kapaliyken arka planda hicbir sey sorgulanmaz. Eslesen
maclarda `EventCard` saat yerine skor + dakika/"Devre arasi" gosterir;
eslesmeyen bir mac o an canli degildir demektir, "baglanti yok" mesaji
artik yalnizca gercek bir hata oldugunda gorunur.

**Futbol disi canli (fonksiyon surum 4-5):** `live-scores` artik yanitinda
`{ scores, espn }` tasir. `espn` listesi iki kaynagi birlestirir (alan adi
tarihsel): ESPN'in anahtarsiz scoreboard uclari (`soccer/uefa.nations`,
`soccer/fifa.worldq.uefa`, `soccer/fifa.friendly`, `soccer/tur.1`,
`soccer/tur.2`, `soccer/uefa.champions`, `soccer/uefa.europa`,
`soccer/uefa.europa.conf`, `basketball/nba`, `basketball/euroleague`,
`tennis/atp`, `tennis/wta`, `racing/f1`, `mma/ufc`) ve BSD'nin
`/api/v2/events/live/` ucu (`series='bsd'`, yalniz futbol).
ESPN futbol panolari BSD'ye ikinci hat; GOAL kaynakli liglerde (1. Lig,
WCQ, hazirlik maclari) tek canli kaynaktir.
`uefa.nations` eklendi cunku API-Sports ucretsiz plani Uluslar Ligi'ni
`live=all` akisina dahil etmiyor. BSD kayitlarinin `id`'si bizim
`events.external_ids.bsd` ile ayni oldugu icin futbol maclari **kimlikle**
eslesir; digerleri ad esitligiyle. Yalnizca durumu `state=in` (ESPN) veya
`status=inprogress|penalties` (BSD) olan kayitlar dondurulur; maclar ESPN'de
`events[].competitions[]` (f1 seanslari, ufc boutlari) veya
`events[].groupings[].competitions[]` (tenis maclari) altindadir.
ESPN/BSD cagrilari API-Sports anahtarindan bagimsiz ve best-effort'tur: bir
pano dusse digerleri doner ve hata futbol onbellegini bozmaz.
MotoGP'nin ESPN'de panosu yok; o brans yalnizca saat penceresiyle canli
isaretlenir.

Esleme `matchEspnLive` icinde, istemcide: basketbol/tenis/ufc iki tarafin
tam fold-edilmis ad esitligiyle (sira serbest; tenis sporculari basliktan
`vs` ayraciyla ayristirilir), f1 seanslari +/-90 dk saat yakinligiyla
(isimler kaynaklar arasinda tutarsiz), ufc kartlari ise baslik cozumlemezse
kart saatine +/-6 saat icindeki canli bout ile `window` olarak isaretlenir.
motogp ve ESPN'in kacirdigi f1 seanslari da `inSessionWindow` (baslangic
ile ends_at/`+120dk` arasi) `window` degeri dondurur. `window` kartin
uzerinde yalnizca kirmizi "Canli" noktasi basar; skor uydurulmaz. Teniste
skor metni `linescores`'un son elemanindan gelen guncel set oyunlaridir
("5–4"), statusDetail ("1st Set") altinda durur; basketbolda puan + ceyrek
("Q3 4:32") gosterilir.

**Canli kurtarma:** Fikstur saglayicilari maci tamamen kacirmissa isim eslestirme
yetmez, cunku bizim `events` tablomuzda aday satir yoktur. Migration 0057,
API-Sports lig kimliklerini Super Lig + bes buyuk lige yazar. `live-scores`
fonksiyonu surum 2, yeni `fixtures?live=all` yanitindaki bu liglerin maclarini
`upsert_event` ile kaydeder; takim kimlikleri/logolari da provider cevabindan
yazilir. Surum 5'ten itibaren bu yazim `EdgeRuntime.waitUntil` ile yanit
bittikten sonra arka planda kosar -- onceden duzineyle sirali RPC cevabi
saniyelerce blokluyordu ("Canli" filtresi gec doluyordu). Bu, ileri tarih
fiksturunu tamamlamaz ama mac canli akisa girdiginde
"basladi ve hala gorunmuyor" durumunu kurtarir. 20 Eylul 2026 Amed SFK–Besiktas
macinda fixture 1584412 bu yolla dogrulandi ve eksik event kaydi eklendi.

Kurtarilan event `external_ids.apisports` tasir. `matchLiveScores` once bu sabit
fixture kimligini kullanir, sonra tam takim adi eslesmesine duser: API "Amed",
katalog "Amed SFK" diyebildigi icin bilinen ayni fixture'i ad farkiyla
gizlememek gerekir. Fixture id yoksa substring eslestirme hala yasaktir.
Migration 0058 `Amed` yazilisini mevcut `Amed SFK` takim kimligine alias olarak
baglar. `live-scores` surum 3 upsert'ten once tum takim adlarini
`team_name_aliases` + canonical takim adlariyla cozer; aksi halde upsert_event
ayri bir "Amed" takimi uretebilirdi. 20 Eylul canli akistan dogrulanan Amed
SFK–Besiktas (API fixture 1584412, devre arasinda 2-0) event'i bu kimliklerle
eksik takvime eklendi.

**Baslamis mac adaylari:** Ana ekran `useUpcomingEvents(7, 3)` ile son 3 saati
de ham sorguya alir. Bu gerekli: eskiden `from = simdi` oldugu icin kickoff
gecer gecmez futbol maci aday listesinden dusuyor, API-Sports canli dese bile
filtrede bulunamiyordu. `currentCalendarEvents` bu gecmis tek maclari normal
takvim ve favori kisayolundan gizler; yalnizca `liveMatches` tam takim adiyla
dogrularsa Canli filtresinde kalir. Cok gunlu/ends_at gelecekte olan
etkinlikler normal takvimde kalmaya devam eder.

```bash
node --test src/features/events/lib/live-match.test.mjs
```

## SP kimlik onizlemesi

`brand-preview/`, mevcut `design-preview/` ve native uygulamadan bagimsizdir.
Bes SVG logo yonu, acik/koyu kullanim, 24/48/80 piksel ikonlar ve uc telefon
modu (acilis, icerik yukleme, ana ekran ikonu) icerir. Secim yalnizca
`sportpulse.brand-choice` tarayici kaydina yazilir; uygulama varliklarini
kendiliginden degistirmez. Animasyonlar tek seferliktir ve sistemin azaltilmis
hareket tercihine uyar. iOS'un native splash'i statiktir; hareketli logo
uygulama basladiktan sonra gosterilebilir.

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory brand-preview
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9227 --user-data-dir=/tmp/sportpulse-brand-chrome --no-first-run --no-default-browser-check about:blank
node brand-preview/browser.test.mjs
```

20 Eylul 2026 salt okunur sunucu kontrolunde cron isleri aktifti; son 24 saatte
sync-events ESPN scoreboard icin 141 adet HTTP 403 kaydetmisti. Son Super Lig
kosusu 3 kayit/degraded, Avrupa Ligi kosusu 0 kayit/failed idi. Kontrol edilen
son 7 gun ile gelecek 21 gun araliginda Besiktas futbol maci bulunamadi.
Salt okunur MCP baglantisi duzeltme dagitimi veya yeni sunucu canli skor
denemesini yetkilendirmez; bu isler tamamlanmis sayilmamali.

## Kadro tamligi

Eski `event-lineup` fallback zincirinde TheSportsDB ucretsiz yaniti tam kadro
olmayabilir: gercek Atletico Madrid–Real Madrid testinde 3 ev / 2 deplasman
oyuncusu geldi ve cache'e yazildi. Bu veri "kadro var" sayilmaz.

Bes buyuk lig ve Super Lig'de `event-api-sports-lineup` (surum 2, `ACTIVE`) birinci kaynak:
mevcut `external_ids.apisports` fikstur kimligini kullanir; yoksa mac gunu +
tam ev/deplasman adi + sabit lig kimligiyle cozer. Iki tarafta en az 11 ilk
oyuncu olmadan yaniti ve cache'i kabul etmez. Istemci de hem birincil hem eski
fallback cevabini `isCompleteLineup` ile ayni 11+11 kuraliyla tekrar dogrular.
Kadro sorgusu kickoff'tan 3 saat once baslar ve kickoff sonrasi 24 saate kadar
kalir; resmi kadro yoksa 4 dakikada bir yeniden dener. Gercek Atletico–Real
testinde 23'er toplam oyuncu, 11'er ilk oyuncu ve 4-4-2 / 4-2-3-1 dizilisleri
dogrulandi. `LineupCard`, mac detayinda `LiveMatchCard`in hemen altina
alindi; kanal/reminder kartlarinin altinda kaybolmaz.

```bash
node --test src/services/providers/api-sports-fixture.test.mjs
```

## Uygulanan Sprint kimligi

Secilen logo 02 Sprint: sol ust kosesi kirpilmis S, #0B2230 zemin,
#4DE3B5 ve #A1EDCE harfler. Geometri/renk kaynagi `src/constants/brand.ts`.
`BrandMark` vektoru ve PNG ureticisi ayni koordinatlari kullanir.

```bash
npm run brand:assets
npm run test:brand
```

PNG uretimi Expo'nun kurulu `jimp-compact` bagimliligini kullanir; yeni bir
rasterizer paketi gerekmez. Ikon 1024px tam kare/opak uretilir, kose maskesini
iOS uygular. Splash ve Android foreground saydam, Android monochrome tek
renklidir. `app.json` splash zemini ve `imageWidth: 160` BrandLaunch ile eslesir.
Ikon/splash degisikligi Metro yenilemesiyle kurulmaz; iki app varyanti da
native olarak yeniden derlenmelidir.

`BrandLaunch` uygulama basinda SP logosunu native splash ile ayni 160px
boyutta ve **sabit** tutar; yalnizca alttaki metinler opacity ile gelir. Logo
ilk JS karesinde translate edilmemeli: iOS native splash cross-fade'i iki farkli
konumdaki logoyu ust uste gosterip lacivert/dikdortgen bir golge olusturuyordu.
`LoadingCard` gercek sorgu beklenirken markali iskelet gosterir. Ortak
`useMotionPreference` sistemin hareket azaltma ve uygulama etkinlik durumunu
izler. Animasyonlar unmount'ta durur; sifirdan yuzde ureten bir ilerleme yoktur.
`scripts/native-ui.test.mjs` test navigatorunde `/brand` ekranini da kontrol
eder; bu rota uretim uygulamasina eklenmez.
