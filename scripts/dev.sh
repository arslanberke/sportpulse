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
  sync_native_project
  exec npx expo run:ios --configuration Release --device "$@"
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
