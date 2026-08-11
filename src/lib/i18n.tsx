import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Lightweight internationalisation.
 * The app ships English and Turkish; it defaults to Turkish (the primary
 * audience) and the user can switch manually in Settings (persisted).
 */

export type Language = 'en' | 'tr';

/** Default language for a fresh install — Turkish for the primary audience. */
function defaultLanguage(): Language {
  return 'tr';
}

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: defaultLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'sportpulse-language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

const en = {
  // Shared
  'common.cancel': 'Cancel',
  'common.remove': 'Remove',
  'common.save': 'Save',
  'common.settings': 'Settings',
  'common.loading': 'Loading…',
  'common.tryAgain': 'Please try again.',
  'common.couldNotSave': 'Could not save',
  'common.somethingWentWrong': 'Something went wrong',
  'common.retry': 'Try again',

  // Tab bar
  'tabs.home': 'This Week',
  'tabs.explore': 'Follow',
  'tabs.profile': 'Profile',

  // Auth
  'auth.tagline': 'Never miss the events you love.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordPlaceholder': 'At least 6 characters',
  'auth.logIn': 'Log in',
  'auth.loginFailed': 'Login failed',
  'auth.noAccount': 'No account yet? ',
  'auth.signUp': 'Sign up',
  'auth.createAccount': 'Create account',
  'auth.joinTagline': 'Reminders for the sports you love.',
  'auth.fullName': 'Full name',
  'auth.checkInbox': 'Check your inbox',
  'auth.checkInboxBody': 'We sent you a confirmation email. Confirm it, then log in.',
  'auth.signUpFailed': 'Sign up failed',
  'auth.alreadyHaveAccount': 'Already have an account? ',
  'auth.emailInvalid': 'Enter a valid email address',
  'auth.passwordMin': 'Password must be at least 6 characters',
  'auth.fullNameMin': 'Enter your full name',

  // Intro slides
  'onboarding.skip': 'Skip',
  'onboarding.next': 'Next',
  'onboarding.getStarted': 'Get started',
  'onboarding.slide1Title': 'All your events in one place',
  'onboarding.slide1Body':
    'SportPulse shows which event, when it starts, and on which channel — across all your sports.',
  'onboarding.slide2Title': 'Follow what you love',
  'onboarding.slide2Body':
    'Pick your sports, leagues and teams. Your week fills with just their fixtures.',
  'onboarding.slide3Title': 'Reminded on time',
  'onboarding.slide3Body':
    'Get notified 1 hour, 1 day — or whenever you choose — before every event, in your timezone.',

  // Follow setup (after sign-up)
  'setup.title': 'What do you follow?',
  'setup.subtitle': 'Pick at least one sport, league or team. You can change this anytime.',
  'setup.countryTitle': 'Where do you watch from?',
  'setup.countrySubtitle': 'Your country decides which TV channels and timezone we show.',
  'setup.done': 'Done',
  'setup.pickAtLeastOne': 'Pick at least one to continue.',

  // Explore / follow screen
  'explore.title': 'Follow',
  'explore.sports': 'Sports',
  'explore.leagues': 'Leagues',
  // Competition groups, listed in this order on the sport screen.
  'explore.kind.league': 'Leagues',
  'explore.kind.continentalCup': 'European cups',
  'explore.kind.domesticCup': 'Domestic cups',
  'explore.kind.nationalTeam': 'National teams',
  // Shown on the league screen while the competition is on a break.
  'explore.startsInDays': '{count} days until the first match',
  'explore.startsTomorrow': 'First match is tomorrow',
  'explore.firstMatch': 'First match: {date}',
  'explore.teams': 'Teams',
  'explore.players': 'Players',
  'explore.searchLeagues': 'Search leagues',
  'explore.noLeagues': 'No leagues match your search.',
  'explore.sportsHint': 'Tick a sport to follow all of it, or open it to pick single leagues.',
  'explore.followWholeSport': 'Follow all of {sport}',
  'explore.followWholeLeague': 'Follow the whole league',
  'explore.allLeaguesIncluded': 'Every league is included — untick one to drop just that league.',
  'explore.coveredBySport': 'Included through the sport. Change it on the sport screen.',
  'explore.coveredByLeague': 'Every team is included — untick one to drop just that team.',
  'explore.pickLeaguesHint': 'Or pick single leagues below.',
  'explore.pickTeamsHint': 'Or pick single teams below.',
  'explore.noTeamLevel': 'Every event in this competition is included.',
  'explore.searchTeams': 'Search teams…',
  'explore.searchAll': 'Search a sport, league or team…',
  'explore.searchMore': 'Type at least two letters.',
  'explore.noResults': 'Nothing matched. Teams appear once their league is synced.',
  'explore.clearSearch': 'Clear search',
  'explore.following': 'Following',
  'explore.follow': 'Follow',
  'explore.noTeams': 'No teams yet — they appear once the squad list is synced.',

  // Home / week list
  'home.title': 'This Week',
  'home.allSports': 'All',
  'home.favorites': 'Favourites',
  'home.favoritesOnly': 'Favourites',
  'home.today': 'Today',
  'home.tomorrow': 'Tomorrow',
  'home.noEvents': 'No upcoming events for your follows. Follow more sports, leagues or teams!',
  'home.search': 'Search this week',
  'home.searchNoEvents': 'No events this week match “{term}”.',
  'home.searchOpen': 'Search',
  'home.searchClose': 'Close search',
  'home.startsIn': 'in {time}',
  'home.ongoing': 'Under way',
  'home.startedAgo': 'started {time} ago',
  'home.days': '{count}d',
  'home.hours': '{count}h',
  'home.minutes': '{count}m',
  'home.postponed': 'Postponed',
  'home.cancelled': 'Cancelled',

  // Event detail
  'event.title': 'Event',
  'event.details': 'Details',
  'event.channel': 'Where to watch',
  'event.bracket': 'Draw',
  'player.rank': 'Rank',
  'player.points': 'Points',
  'player.matches': 'Upcoming matches',
  'player.noMatches': 'No upcoming matches.',
  'player.notFound': 'Player not found.',
  'event.venue': 'Venue',
  'event.noChannel': 'No channel info for your country yet.',
  'event.addToCalendar': 'Add to calendar (.ics)',
  'event.addedToCalendar': 'Added to calendar',
  'event.couldNotShare': 'Could not share the calendar file',
  'event.lineups': 'Lineups',
  'event.substitutes': 'Substitutes',
  'event.keeperShort': 'GK',
  'event.lineupsLoading': 'Loading lineups…',
  'event.lineupsPending': 'Official lineups are usually announced ~1 hour before kickoff.',
  'event.lineupsError': "Couldn't load lineups. Try again shortly.",
  'event.briefing': 'What to know',
  'event.briefingLoading': 'Preparing the briefing…',
  'event.briefingSource': 'AI summary based on recent form and head-to-head. May be incomplete.',
  'event.results': 'Session results',
  'event.standings': 'Championship standings',
  'event.leagueStandings': 'Standings',
  'event.standings.w': 'W',
  'event.standings.l': 'L',
  'event.standings.pct': 'PCT',
  'event.standings.gb': 'GB',
  'event.standings.playoffLegend': 'Top 8 — playoff / play-in spots',
  'event.reminders': 'Your reminders',
  'event.remindersBody': 'Reminder times follow your settings and your quiet hours.',
  'event.noReminders': 'No reminders will fire — the event is too soon or reminders are off.',
  'event.notFound': 'Event not found.',
  'event.startLiveActivity': 'Live countdown (Dynamic Island)',
  'event.liveActivityStarted': 'Live countdown started',
  'event.share': 'Share',
  'event.shareMessage': '{title}\n🗓 {time}',
  'event.shareMessageWithChannel': '{title}\n🗓 {time}\n📺 {channel}',

  // Team page
  'team.fixtures': 'Fixtures',
  'team.standings': 'Standings',
  'team.noFixtures': 'No upcoming matches in the next few months.',
  'team.noStandings': 'No table for this club’s competitions — knockout cups have none.',
  'team.standingsLoading': 'Loading tables…',
  'team.notFound': 'Team not found.',
  'team.follow': 'Follow this team',
  'team.following': 'Following',
  'team.coveredByLeague': 'Included through a follow above it.',
  'table.played': 'P',
  'table.w': 'W',
  'table.d': 'D',
  'table.l': 'L',
  'table.gd': 'GD',
  'table.pts': 'PTS',
  'table.pct': 'PCT',
  'table.gb': 'GB',

  // Settings
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.themeSystem': 'System',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.country': 'Country',
  'settings.countryBody': 'Decides which TV channels you see.',
  'settings.reminderOffsets': 'Remind me before events',
  'settings.reminderOffsetsBody': 'Pick one or more. Each fires a separate notification.',
  'settings.offset.15m': '15 min',
  'settings.offset.1h': '1 hour',
  'settings.offset.3h': '3 hours',
  'settings.offset.1d': '1 day',
  'settings.quietHours': 'Quiet hours',
  'settings.quietHoursBody':
    'Reminders that would fire in this window are delayed until it ends (e.g. sleep hours).',
  'settings.quietFrom': 'From',
  'settings.quietUntil': 'Until',
  'settings.quietDisabled': 'Off',
  'settings.timeFormat': 'Use the format HH:MM, e.g. 23:00',
  'settings.pushNotifications': 'Push notifications',
  'settings.pushNotificationsBody': 'Get alerts when a fixture you follow changes.',
  'settings.extraAlerts': 'Other notifications',
  'settings.resultAlerts': 'Full-time alert',
  'settings.resultAlertsBody': 'A nudge once an event you follow should have finished.',
  'settings.weeklyDigest': 'Weekly summary',
  'settings.weeklyDigestBody': 'Monday morning rundown of the week ahead.',
  'settings.logOut': 'Log out',
  'settings.signOutFailed': 'Sign out failed',
  'settings.saved': 'Saved',
  'privacy.title': 'Privacy notice',
  'settings.privacy': 'Read the privacy notice',
  'settings.deleteAccount': 'Delete account',
  'settings.deleteAccountBody':
    'Removes your account together with your follows, reminder preferences and notifications. This cannot be undone.',
  'settings.deleteAccountConfirm': 'Delete your account?',
  'settings.deleteAccountConfirmBody':
    'Your account and everything tied to it will be deleted for good. This cannot be undone.',
  'settings.deleteAccountFailed': 'Could not delete the account',
  'settings.legal': 'Legal',
  // Marka hukukunda "nominative use": bir yarismadan soz etmek icin adini ve
  // amblemini kullanmak, onay/baglanti izlenimi verilmedigi surece mesru
  // sayilir. Bu yuzden ilisiksizlik acikca yazilir (ayni ifade uygulamanin
  // App Store aciklamasinda da bulunmali).
  'settings.legalMarks':
    'Team, league and competition names and crests are used for identification purposes only. No club, league or federation endorses, sponsors, collaborates with or is affiliated with this application.',
  'settings.legalSources':
    'Fixtures, results and standings are compiled from apifootball.com, ESPN, MotoGP, EuroLeague, Jolpica and TheSportsDB. Broadcast listings may change without notice.',

  // Profile
  'profile.title': 'Profile',
  'profile.edit': 'Edit profile',
  'profile.yourName': 'Your name',
  'profile.save': 'Save profile',
  'profile.saved': 'Profile saved',
  'profile.savedBody': 'Your changes are live.',
  'profile.nameMin': 'Enter your name',
  'profile.followingCount': 'Following',

  // Local reminder notifications
  'reminders.body': 'Starts at {time}.',
  'reminders.bodyWithChannel': 'Starts at {time} · 📺 {channel}',
  'results.body': 'Should be over by now — tap to see the result.',
  'digest.title': 'Your week in sport',
  'digest.body': '{count} events you follow are coming up this week.',

  // Realtime fixture-change notifications
  'notif.eventTimeChanged.title': 'Fixture time changed',
  'notif.eventTimeChanged.body': '{title} moved to {time}.',
  'notif.eventPostponed.title': 'Event postponed',
  'notif.eventPostponed.body': '{title} has been postponed.',
};

type TranslationKey = keyof typeof en;

const tr: Record<TranslationKey, string> = {
  'common.cancel': 'İptal',
  'common.remove': 'Kaldır',
  'common.save': 'Kaydet',
  'common.settings': 'Ayarlar',
  'common.loading': 'Yükleniyor…',
  'common.tryAgain': 'Lütfen tekrar deneyin.',
  'common.couldNotSave': 'Kaydedilemedi',
  'common.somethingWentWrong': 'Bir şeyler ters gitti',
  'common.retry': 'Tekrar dene',

  'tabs.home': 'Bu Hafta',
  'tabs.explore': 'Takip Et',
  'tabs.profile': 'Profil',

  'auth.tagline': 'Sevdiğin etkinlikleri asla kaçırma.',
  'auth.email': 'E-posta',
  'auth.password': 'Şifre',
  'auth.passwordPlaceholder': 'En az 6 karakter',
  'auth.logIn': 'Giriş yap',
  'auth.loginFailed': 'Giriş başarısız',
  'auth.noAccount': 'Hesabın yok mu? ',
  'auth.signUp': 'Kayıt ol',
  'auth.createAccount': 'Hesap oluştur',
  'auth.joinTagline': 'Sevdiğin sporlar için hatırlatmalar.',
  'auth.fullName': 'Ad soyad',
  'auth.checkInbox': 'E-postanı kontrol et',
  'auth.checkInboxBody': 'Sana bir onay e-postası gönderdik. Onayla, sonra giriş yap.',
  'auth.signUpFailed': 'Kayıt başarısız',
  'auth.alreadyHaveAccount': 'Zaten hesabın var mı? ',
  'auth.emailInvalid': 'Geçerli bir e-posta adresi gir',
  'auth.passwordMin': 'Şifre en az 6 karakter olmalı',
  'auth.fullNameMin': 'Adını ve soyadını gir',

  'onboarding.skip': 'Atla',
  'onboarding.next': 'İleri',
  'onboarding.getStarted': 'Başla',
  'onboarding.slide1Title': 'Tüm etkinlikler tek yerde',
  'onboarding.slide1Body':
    'SportPulse hangi etkinlik, ne zaman ve hangi kanalda gösterir — tüm sporların tek uygulamada.',
  'onboarding.slide2Title': 'Sevdiklerini takip et',
  'onboarding.slide2Body':
    'Branşlarını, liglerini ve takımlarını seç. Haftan sadece onların fikstürüyle dolsun.',
  'onboarding.slide3Title': 'Tam zamanında hatırla',
  'onboarding.slide3Body':
    'Her etkinlikten 1 saat, 1 gün — ya da istediğin kadar — önce, kendi saat diliminde bildirim al.',

  'setup.title': 'Neyi takip ediyorsun?',
  'setup.subtitle': 'En az bir branş, lig veya takım seç. İstediğin zaman değiştirebilirsin.',
  'setup.countryTitle': 'Nereden izliyorsun?',
  'setup.countrySubtitle': 'Ülken hangi TV kanallarını ve saat dilimini göstereceğimizi belirler.',
  'setup.done': 'Tamam',
  'setup.pickAtLeastOne': 'Devam etmek için en az bir seçim yap.',

  'explore.title': 'Takip Et',
  'explore.sports': 'Branşlar',
  'explore.leagues': 'Ligler',
  'explore.kind.league': 'Ligler',
  'explore.kind.continentalCup': 'Avrupa kupaları',
  'explore.kind.domesticCup': 'Ülke kupaları',
  'explore.kind.nationalTeam': 'Milli takımlar',
  'explore.startsInDays': 'İlk maça {count} gün',
  'explore.startsTomorrow': 'İlk maç yarın',
  'explore.firstMatch': 'İlk maç: {date}',
  'explore.teams': 'Takımlar',
  'explore.players': 'Sporcular',
  'explore.searchLeagues': 'Lig ara…',
  'explore.noLeagues': 'Aramanla eşleşen lig yok.',
  'explore.sportsHint': 'Branşı işaretleyip tamamını takip et ya da açıp tek tek lig seç.',
  'explore.followWholeSport': 'Tüm {sport} takibi',
  'explore.followWholeLeague': 'Ligin tamamını takip et',
  'explore.allLeaguesIncluded': 'Tüm ligler dahil — istemediğinin tikini kaldırman yeterli.',
  'explore.coveredBySport': 'Branş seçili olduğu için dahil. Değiştirmek için branş ekranına dön.',
  'explore.coveredByLeague': 'Tüm takımlar dahil — istemediğinin tikini kaldırman yeterli.',
  'explore.pickLeaguesHint': 'Ya da aşağıdan tek tek lig seç.',
  'explore.pickTeamsHint': 'Ya da aşağıdan tek tek takım seç.',
  'explore.noTeamLevel': 'Bu organizasyondaki tüm etkinlikler dahil.',
  'explore.searchTeams': 'Takım ara…',
  'explore.searchAll': 'Branş, lig ya da takım ara…',
  'explore.searchMore': 'En az iki harf yaz.',
  'explore.noResults': 'Eşleşen bir şey yok. Takımlar, ligleri senkronlandıkça görünür.',
  'explore.clearSearch': 'Aramayı temizle',
  'explore.following': 'Takiptesin',
  'explore.follow': 'Takip et',
  'explore.noTeams': 'Henüz takım yok — kadro listesi senkronlanınca görünecekler.',

  'home.title': 'Bu Hafta',
  'home.allSports': 'Tümü',
  'home.favorites': 'Favorilerin',
  'home.favoritesOnly': 'Favoriler',
  'home.today': 'Bugün',
  'home.tomorrow': 'Yarın',
  'home.noEvents':
    'Takip ettiklerin için yaklaşan etkinlik yok. Daha fazla branş, lig veya takım takip et!',
  'home.search': 'Bu hafta içinde ara',
  'home.searchNoEvents': '“{term}” ile eşleşen etkinlik yok.',
  'home.searchOpen': 'Ara',
  'home.searchClose': 'Aramayı kapat',
  'home.startsIn': '{time} sonra',
  'home.ongoing': 'Devam ediyor',
  'home.startedAgo': '{time} önce başladı',
  'home.days': '{count}g',
  'home.hours': '{count}s',
  'home.minutes': '{count}dk',
  'home.postponed': 'Ertelendi',
  'home.cancelled': 'İptal edildi',

  'event.title': 'Etkinlik',
  'event.details': 'Detaylar',
  'event.channel': 'Nereden izlenir',
  'event.bracket': 'Fikstür',
  'player.rank': 'Sıralama',
  'player.points': 'Puan',
  'player.matches': 'Yaklaşan maçları',
  'player.noMatches': 'Yaklaşan maç yok.',
  'player.notFound': 'Sporcu bulunamadı.',
  'event.venue': 'Mekan',
  'event.noChannel': 'Ülken için henüz kanal bilgisi yok.',
  'event.addToCalendar': 'Takvime ekle (.ics)',
  'event.addedToCalendar': 'Takvime eklendi',
  'event.couldNotShare': 'Takvim dosyası paylaşılamadı',
  'event.lineups': 'Kadrolar',
  'event.substitutes': 'Yedekler',
  'event.keeperShort': 'K',
  'event.lineupsLoading': 'Kadrolar yükleniyor…',
  'event.lineupsPending': 'Resmi kadrolar genelde maçtan ~1 saat önce açıklanır.',
  'event.lineupsError': 'Kadrolar yüklenemedi. Birazdan tekrar dene.',
  'event.briefing': 'Bilinmesi gerekenler',
  'event.briefingLoading': 'Özet hazırlanıyor…',
  'event.briefingSource': 'Son form ve karşılıklı maçlara dayalı AI özeti. Eksik olabilir.',
  'event.results': 'Seans sonuçları',
  'event.standings': 'Puan durumu',
  'event.leagueStandings': 'Puan durumu',
  'event.standings.w': 'G',
  'event.standings.l': 'M',
  'event.standings.pct': '%',
  'event.standings.gb': 'AV',
  'event.standings.playoffLegend': 'İlk 8 — playoff / play-in hattı',
  'event.reminders': 'Hatırlatmaların',
  'event.remindersBody': 'Hatırlatma saatleri ayarlarına ve sessiz saatlerine göre belirlenir.',
  'event.noReminders': 'Hatırlatma kurulmayacak — etkinlik çok yakın veya hatırlatmalar kapalı.',
  'event.notFound': 'Etkinlik bulunamadı.',
  'event.startLiveActivity': 'Canlı geri sayım (Dynamic Island)',
  'event.liveActivityStarted': 'Canlı geri sayım başlatıldı',
  'event.share': 'Paylaş',
  'event.shareMessage': '{title}\n🗓 {time}',
  'event.shareMessageWithChannel': '{title}\n🗓 {time}\n📺 {channel}',

  'team.fixtures': 'Fikstür',
  'team.standings': 'Puan durumu',
  'team.noFixtures': 'Önümüzdeki aylarda planlanmış maç yok.',
  'team.noStandings': 'Bu kulübün kupalarında tablo yok — eleme usulü turlarda puan durumu tutulmaz.',
  'team.standingsLoading': 'Tablolar yükleniyor…',
  'team.notFound': 'Takım bulunamadı.',
  'team.follow': 'Bu takımı takip et',
  'team.following': 'Takiptesin',
  'team.coveredByLeague': 'Üstteki bir takip sayesinde zaten dahil.',
  'table.played': 'O',
  'table.w': 'G',
  'table.d': 'B',
  'table.l': 'M',
  'table.gd': 'AV',
  'table.pts': 'P',
  'table.pct': '%',
  'table.gb': 'F',

  'settings.language': 'Dil',
  'settings.theme': 'Tema',
  'settings.themeSystem': 'Sistem',
  'settings.themeLight': 'Açık',
  'settings.themeDark': 'Koyu',
  'settings.country': 'Ülke',
  'settings.countryBody': 'Hangi TV kanallarını göreceğini belirler.',
  'settings.reminderOffsets': 'Etkinlikten önce hatırlat',
  'settings.reminderOffsetsBody': 'Birden fazla seçebilirsin. Her biri ayrı bildirim gönderir.',
  'settings.offset.15m': '15 dk',
  'settings.offset.1h': '1 saat',
  'settings.offset.3h': '3 saat',
  'settings.offset.1d': '1 gün',
  'settings.quietHours': 'Sessiz saatler',
  'settings.quietHoursBody':
    'Bu aralıkta çalacak hatırlatmalar aralık bitene kadar ertelenir (ör. uyku saatleri).',
  'settings.quietFrom': 'Başlangıç',
  'settings.quietUntil': 'Bitiş',
  'settings.quietDisabled': 'Kapalı',
  'settings.timeFormat': 'SS:DD biçimini kullan, ör. 23:00',
  'settings.pushNotifications': 'Anlık bildirimler',
  'settings.pushNotificationsBody': 'Takip ettiğin bir fikstür değişince haber al.',
  'settings.extraAlerts': 'Diğer bildirimler',
  'settings.resultAlerts': 'Maç sonu bildirimi',
  'settings.resultAlertsBody': 'Takip ettiğin etkinlik bittiğinde sonucu hatırlatır.',
  'settings.weeklyDigest': 'Haftalık özet',
  'settings.weeklyDigestBody': 'Pazartesi sabahı haftanın programını özetler.',
  'settings.logOut': 'Çıkış yap',
  'settings.signOutFailed': 'Çıkış başarısız',
  'settings.saved': 'Kaydedildi',
  'privacy.title': 'Aydınlatma metni',
  'settings.privacy': 'Aydınlatma metnini oku',
  'settings.deleteAccount': 'Hesabı sil',
  'settings.deleteAccountBody':
    'Hesabını; takiplerin, hatırlatma tercihlerin ve bildirimlerinle birlikte siler. Bu işlem geri alınamaz.',
  'settings.deleteAccountConfirm': 'Hesabını silmek istiyor musun?',
  'settings.deleteAccountConfirmBody':
    'Hesabın ve ona bağlı her şey kalıcı olarak silinecek. Bu işlem geri alınamaz.',
  'settings.deleteAccountFailed': 'Hesap silinemedi',
  'settings.legal': 'Yasal',
  'settings.legalMarks':
    'Takım, lig ve turnuva adları ile amblemleri yalnızca tanımlama amacıyla kullanılır. Hiçbir kulüp, lig ya da federasyon bu uygulamayı onaylamaz, desteklemez, uygulamayla işbirliği içinde değildir ve uygulamayla herhangi bir ilişkisi yoktur.',
  'settings.legalSources':
    'Fikstür, sonuç ve puan durumları apifootball.com, ESPN, MotoGP, EuroLeague, Jolpica ve TheSportsDB kaynaklarından derlenir. Yayın bilgileri önceden haber verilmeksizin değişebilir.',

  'profile.title': 'Profil',
  'profile.edit': 'Profili düzenle',
  'profile.yourName': 'Adın',
  'profile.save': 'Profili kaydet',
  'profile.saved': 'Profil kaydedildi',
  'profile.savedBody': 'Değişikliklerin yayında.',
  'profile.nameMin': 'Adını gir',
  'profile.followingCount': 'Takip edilen',

  'reminders.body': '{time} başlıyor.',
  'reminders.bodyWithChannel': '{time} başlıyor · 📺 {channel}',
  'results.body': 'Bitmiş olmalı — sonucu görmek için dokun.',
  'digest.title': 'Bu haftaki sporun',
  'digest.body': 'Bu hafta takip ettiğin {count} etkinlik var.',

  'notif.eventTimeChanged.title': 'Fikstür saati değişti',
  'notif.eventTimeChanged.body': '{title} {time} saatine alındı.',
  'notif.eventPostponed.title': 'Etkinlik ertelendi',
  'notif.eventPostponed.body': '{title} ertelendi.',
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, tr };

const dayNamesByLanguage: Record<Language, string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
};

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Translate a key in the given language (for use outside React). */
export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  return interpolate(dictionaries[language][key], params);
}

/** BCP 47 locale for date/number formatting. */
export function localeFor(language: Language): string {
  return language === 'tr' ? 'tr-TR' : 'en-GB';
}

/** Hook giving components the current language and a `t` function. */
export function useI18n(): { language: Language; t: Translate; dayNames: string[] } {
  const language = useLanguageStore((s) => s.language);
  return useMemo(
    () => ({
      language,
      t: (key, params) => translate(language, key, params),
      dayNames: dayNamesByLanguage[language],
    }),
    [language],
  );
}
