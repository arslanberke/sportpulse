#!/usr/bin/env bash
#
# Fiziksel iPhone uzerinde gelistirme yardimcisi.
#
# Metro sunucusunun adresi olarak Mac'in sabit Bonjour adi (<isim>.local)
# kullanilir. Cihaza gomulen adres derleme aninda belirlendigi icin, duz IP
# gomuldugunde ag her degistiginde (ev agi, hotspot, USB paylasimi) uygulamanin
# yeniden derlenmesi gerekir. Bonjour adi degismedigi icin bu ihtiyaci ortadan
# kaldirir.
#
# Kullanim:
#   ./scripts/dev.sh start    Metro sunucusunu baslatir
#   ./scripts/dev.sh phone    Gelistirme surumunu derleyip cihaza kurar
#   ./scripts/dev.sh release  Gunluk kullanim surumunu kurar (JS gomulu)
#   ./scripts/dev.sh launch   Kurulu gelistirme surumunu cihazda baslatir
#   ./scripts/dev.sh shot     Cihazin ekran goruntusunu alir
#   ./scripts/dev.sh log      Cihazdan uygulama loglarini akitir
#
# Telefonda iki uygulama yan yana durur: "sportpulse" (gunluk kullanim, Metro'ya
# ihtiyac duymaz) ve "sportpulse dev" (Metro'ya bagli, kod degisikliklerini
# aninda gosterir). Ayri paket kimlikleri oldugu icin biri digerini ezmez.
set -euo pipefail

cd "$(dirname "$0")/.."

# iOS derlemesi tam Xcode gerektirir; xcode-select CommandLineTools'u
# gosteriyorsa derleme basarisiz olur. Sistem ayarina dokunmadan, kurulu
# Xcode'u bu surec icin isaret ederiz.
if [[ -z "${DEVELOPER_DIR:-}" ]]; then
  for candidate in /Applications/Xcode.app /Applications/Xcode-beta.app; do
    if [[ -d "$candidate/Contents/Developer" ]]; then
      export DEVELOPER_DIR="$candidate/Contents/Developer"
      break
    fi
  done
fi

export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-$(scutil --get LocalHostName).local}"

# devicectl komutlari gelistirme surumunu hedefler; gunluk kullanim surumune
# dokunulmamasi bilincli, o surum bozulmadan telefonda kalmali.
BUNDLE_ID=com.berkearslan.sportpulse.dev

# devicectl, USB udid'inden farkli bir CoreDevice tanimlayicisi kullanir.
# Bagli tek fiziksel cihazin tanimlayicisini tablodan okuruz.
physical_device() {
  local id
  id=$(xcrun devicectl list devices 2>/dev/null |
    awk '/physical/ { print }' |
    grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' |
    head -1)
  if [[ -z "$id" ]]; then
    echo "Bagli fiziksel cihaz bulunamadi. Telefonu USB ile bagla ve kilidini ac." >&2
    return 1
  fi
  printf '%s' "$id"
}

# Cihaz belirtilmediyse USB ile bagli olani kullan; aksi halde expo secim sorar
# ve komut etkilesim bekler.
attached_device() {
  idevice_id -l 2>/dev/null | head -1
}

# `expo run:ios`, ios/ klasoru varsa prebuild'i atlar; paket kimligi ve ad
# APP_VARIANT'a gore degistigi icin native proje her derleme oncesi yeniden
# uretilmeli, aksi halde iki surum ayni kimlikle derlenip birbirini ezer.
sync_native_project() {
  npx expo prebuild -p ios
}

# Gunluk surum her zaman en guncel kodla derlenmeli: expo-updates, gomulu
# paketten daha eski tarihli guncellemeyi almaz, eski koddan derlenen surum de
# telefonda eski hali gosterir. Calisma kopyasi temizse entegrasyon dalini
# ceker; degilse uyarip mevcut kodla devam eder.
RELEASE_BRANCH=devin/wip-follow-hierarchy-notifications

pull_latest() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Uyari: kaydedilmemis degisiklik var, en guncel kod cekilmedi." >&2
    return 0
  fi
  git fetch origin "$RELEASE_BRANCH" &&
    git checkout "$RELEASE_BRANCH" &&
    git merge --ff-only "origin/$RELEASE_BRANCH" ||
    echo "Uyari: en guncel kod cekilemedi, mevcut kodla derleniyor." >&2
}

# Derlemeden sonra ayni kodu OTA olarak da yayinlar; boylece telefon gomulu
# paket yerine yayinlanan guncellemeyi gosterir ve sonraki guncellemeler
# sorunsuz gelir. EAS'a giris yoksa atlanir.
publish_update() {
  if ! npx -y eas-cli@24.8.0 whoami >/dev/null 2>&1; then
    echo "Uyari: EAS girisi yok, guncelleme yayinlanmadi." >&2
    return 0
  fi
  npx -y eas-cli@24.8.0 update --channel production --environment production \
    --platform ios --message "Derleme sonrasi guncel hal" --non-interactive ||
    echo "Uyari: guncelleme yayinlanamadi." >&2
}

case "${1:-start}" in
start)
  shift || true
  export APP_VARIANT=dev
  echo "Metro adresi: http://$REACT_NATIVE_PACKAGER_HOSTNAME:8081"
  exec npx expo start "$@"
  ;;
phone)
  shift || true
  export APP_VARIANT=dev
  echo "Cihaza gomulecek Metro adresi: http://$REACT_NATIVE_PACKAGER_HOSTNAME:8081"
  if [[ $# -eq 0 ]] && udid=$(attached_device) && [[ -n "$udid" ]]; then
    set -- "$udid"
  fi
  sync_native_project
  exec npx expo run:ios --device "$@"
  ;;
release)
  shift || true
  # APP_VARIANT verilmez: gunluk kullanilan surum derlenir. JS paketi gomulu
  # geldigi icin Metro'ya ihtiyac duymaz, Mac kapaliyken de acilir.
  if [[ $# -eq 0 ]] && udid=$(attached_device) && [[ -n "$udid" ]]; then
    set -- "$udid"
  fi
  pull_latest
  npm install --no-audit --no-fund
  sync_native_project
  npx expo run:ios --configuration Release --device "$@"
  publish_update
  # pull_latest bu dosyayi degistirmis olabilir; bash kalan satirlari yeni
  # dosyadan okumasin diye burada cikilir.
  exit 0
  ;;
launch)
  xcrun devicectl device process launch --terminate-existing \
    --device "$(physical_device)" "$BUNDLE_ID"
  ;;
shot)
  destination="${2:-/tmp/sportpulse-screen.png}"
  xcrun devicectl device capture screenshot \
    --device "$(physical_device)" --destination "$destination"
  ;;
log)
  # Yalnizca uygulamanin satirlari; developer disk image gerektirmez.
  exec idevicesyslog -p sportpulse
  ;;
*)
  echo "Bilinmeyen komut: $1" >&2
  sed -n '/^# Kullanim:/,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;$d' >&2
  exit 1
  ;;
esac
