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
  'explore.teams': 'Teams',
  'explore.searchTeams': 'Search teams…',
  'explore.following': 'Following',
  'explore.follow': 'Follow',
  'explore.noTeams': 'No teams yet — they appear as fixtures are synced.',

  // Home / week list
  'home.title': 'This Week',
  'home.today': 'Today',
  'home.tomorrow': 'Tomorrow',
  'home.noEvents': 'No upcoming events for your follows. Follow more sports, leagues or teams!',
  'home.startsIn': 'in {time}',
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
  'event.reminders': 'Your reminders',
  'event.remindersBody': 'Reminder times follow your settings and your quiet hours.',
  'event.noReminders': 'No reminders will fire — the event is too soon or reminders are off.',
  'event.notFound': 'Event not found.',
  'event.startLiveActivity': 'Live countdown (Dynamic Island)',
  'event.liveActivityStarted': 'Live countdown started',

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
  'settings.logOut': 'Log out',
  'settings.signOutFailed': 'Sign out failed',
  'settings.saved': 'Saved',

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
  'explore.teams': 'Takımlar',
  'explore.searchTeams': 'Takım ara…',
  'explore.following': 'Takiptesin',
  'explore.follow': 'Takip et',
  'explore.noTeams': 'Henüz takım yok — fikstürler senkronlandıkça görünecekler.',

  'home.title': 'Bu Hafta',
  'home.today': 'Bugün',
  'home.tomorrow': 'Yarın',
  'home.noEvents':
    'Takip ettiklerin için yaklaşan etkinlik yok. Daha fazla branş, lig veya takım takip et!',
  'home.startsIn': '{time} sonra',
  'home.startedAgo': '{time} önce başladı',
  'home.days': '{count}g',
  'home.hours': '{count}s',
  'home.minutes': '{count}dk',
  'home.postponed': 'Ertelendi',
  'home.cancelled': 'İptal edildi',

  'event.title': 'Etkinlik',
  'event.details': 'Detaylar',
  'event.channel': 'Nereden izlenir',
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
  'event.reminders': 'Hatırlatmaların',
  'event.remindersBody': 'Hatırlatma saatleri ayarlarına ve sessiz saatlerine göre belirlenir.',
  'event.noReminders': 'Hatırlatma kurulmayacak — etkinlik çok yakın veya hatırlatmalar kapalı.',
  'event.notFound': 'Etkinlik bulunamadı.',
  'event.startLiveActivity': 'Canlı geri sayım (Dynamic Island)',
  'event.liveActivityStarted': 'Canlı geri sayım başlatıldı',

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
  'settings.logOut': 'Çıkış yap',
  'settings.signOutFailed': 'Çıkış başarısız',
  'settings.saved': 'Kaydedildi',

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
