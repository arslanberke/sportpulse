import { calendarDays, currentCalendarEvents, filterCalendarEvents, groupCalendarEvents } from '@/features/events/lib/calendar-view';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { useSports } from '@/features/catalog/hooks/use-catalog';
import { EventCard } from '@/features/events/components/event-card';
import { FavoritesSection } from '@/features/events/components/favorites-section';
import { FixtureHealthNotice } from '@/features/events/components/fixture-health-notice';
import { WeekHeader } from '@/features/events/components/week-header';
import { useLiveScores, useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useFixtureHealth } from '@/features/events/hooks/use-fixture-health';
import { espnLiveScoreText, matchEspnLive, matchLiveScores } from '@/features/events/lib/live-match';
import { isFavoriteEvent, useFavorites } from '@/features/follows/hooks/use-favorites';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { formatDay, isSameDay } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { useNow } from '@/lib/now';
import { matchesAny, searchNeedles } from '@/lib/search';
import { useStoredFlag } from '@/lib/use-stored-flag';
import type { Sport, SportEvent } from '@/types';

/**
 * Groups events by calendar day (local timezone), keeping order.
 *
 * Devam eden cok gunlu etkinlikler bugune yazilir. Baslangica gore
 * gruplandiklarinda gecmis bir gunun altina dusuyorlar: Cincinnati Open sabah
 * basladi, bir hafta surecek, ama "BUGUN" basliginda gorunmuyordu.
 */
function groupByDay(
  events: SportEvent[],
  now: Date,
): { day: Date; events: SportEvent[] }[] {
  return groupCalendarEvents(events, now);
}

function SportTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`mr-2 min-h-11 flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
        active ? 'bg-primary' : 'bg-surface border border-line'
      }`}
    >
      {icon && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={15}
          color={active ? '#FFFFFF' : colors.inkSecondary}
        />
      )}
      <Text
        className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** "This week": every upcoming event for the user's follows, day by day. */
export default function HomeScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: follows, isFetched: followsFetched } = useFollows();
  const { data: sports } = useSports();
  // Son 3 saatte baslamis maclar da ham adaylarda tutulur: normal takvimden
  // asagida suzulurler, ama canli akis dogrularsa "Canli" filtresinde kalirlar.
  const { events, isLoading, error } = useUpcomingEvents(7, 3);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const compact = useStoredFlag('home.compact');
  const effects = useStoredFlag('home.effects', true);
  const colors = useThemeColors();
  const now = useNow();
  const days = calendarDays(now);
  const selectedDay = dayOffset === null ? null : days[dayOffset];
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const fixtureHealth = useFixtureHealth(follows, favoritePlayerIds);
  const favoritesCollapsed = useStoredFlag('home.favoritesCollapsed');
  const [liveOnly, setLiveOnly] = useState(false);
  const liveScores = useLiveScores(liveOnly);
  const liveMatches = useMemo(
    () => (liveOnly ? matchLiveScores(events, liveScores.data?.scores ?? []) : new Map()),
    [liveOnly, events, liveScores.data],
  );
  // Futbol disi canlilar (NBA, tenis, F1, UFC) ESPN akisindan; motogp ve
  // kaynagin kaciridigi f1 seanslari saat penceresiyle 'window' isaretlenir.
  const espnMatches = useMemo(
    () => (liveOnly ? matchEspnLive(events, liveScores.data?.espn ?? []) : new Map()),
    [liveOnly, events, liveScores.data],
  );

  // Kullanici kaydirmaya basladiginda alan kapanir: liste tam ekran kalir, terim
  // basliktaki dugmede gorunur olmaya devam eder.
  //
  // Kaydirma konumuna degil dokunma hareketine bakiliyor: yazarken liste
  // suzuldugu icin icerik yuksekligi degisiyor ve bu da kaydirma olayi
  // uretiyordu. Sonuc olarak kullanici yazmaya baslar baslamaz alan kapaniyor,
  // yazdigi metni goremiyordu.
  const collapseOnScroll = useCallback(() => setSearchExpanded(false), []);

  // Only offer tabs for sports that actually have events this week.
  const sportTabs = useMemo<Sport[]>(() => {
    const present = new Set(events.map((e) => e.sportId));
    return (sports ?? []).filter((s) => present.has(s.id));
  }, [sports, events]);

  // A stale filter (sport dropped out of the window) falls back to "all".
  const activeFilter =
    sportFilter && sportTabs.some((s) => s.id === sportFilter) ? sportFilter : null;

  // Arama terimi etkinligin kendi adini, ligini ve iki takimini birlikte tarar:
  // "fenerbahce" ya da "avrupa ligi" ikisi de listeyi daraltir.
  const searchedEvents = useMemo(() => {
    const needles = searchNeedles(searchTerm);
    if (needles.length === 0) return events;
    return events.filter((e) =>
      matchesAny([e.title, e.leagueName, e.homeTeamName, e.awayTeamName], needles),
    );
  }, [events, searchTerm]);

  const weekEvents = filterCalendarEvents(searchedEvents, {
    sportId: activeFilter, favoritesOnly, leagueId: leagueFilter, channelId: channelFilter,
  }, (event) => isFavoriteEvent(event, favoriteTeamIds, favoritePlayerIds));
  const calendarWeekEvents = currentCalendarEvents(weekEvents, now);
  const visibleEvents = liveOnly
    ? weekEvents.filter((e) => liveMatches.has(e.id) || espnMatches.has(e.id))
    : filterCalendarEvents(calendarWeekEvents, { day: selectedDay }, () => true);
  const leagues = [...new Map(events.filter(e => e.leagueId && e.leagueName).map(e => [e.leagueId!, e.leagueName!])).entries()];
  const channels = [...new Map(events.flatMap(e => e.channels ?? []).map(c => [c.id, c.name])).entries()];
  const resetFilters = () => {
    setSportFilter(null);
    setFavoritesOnly(false);
    setLiveOnly(false);
    setDayOffset(null);
    setLeagueFilter(null);
    setChannelFilter(null);
    setSearchTerm('');
  };

  // Tepedeki kisayol: yildizli kuluplerin yaklasan maclari. Asagidaki takvimden
  // cikarilmiyorlar; bolumu kapali tutan kullanici da maci kendi gununde gorur.
  const favoriteEvents = liveOnly ? [] : calendarWeekEvents.filter((e) => isFavoriteEvent(e, favoriteTeamIds, favoritePlayerIds));

  // Suzgec acikken `visibleEvents` zaten yalnizca favorileri tasiyor; dugmenin
  // gorunurlugu suzgecten bagimsiz olmali, yoksa kapatan kullanici dugmeyi de
  // kaybederdi.
  const hasFavoriteEvents = useMemo(
    () => searchedEvents.some((e) => isFavoriteEvent(e, favoriteTeamIds, favoritePlayerIds)),
    [searchedEvents, favoriteTeamIds, favoritePlayerIds],
  );

  // First run after sign-up: send the user to the follow/country setup.
  useEffect(() => {
    if (followsFetched && (follows ?? []).length === 0) {
      router.push('/setup');
    }
  }, [followsFetched, follows, router]);

  // Gosterge kendi durumundan besleniyor. Onceden `queryClient.isFetching()`
  // okunuyordu: bu deger degistiginde React'e haber vermedigi icin gosterge
  // donmeye baslayip bir daha durmuyordu -- yenilemek icin asagi ceken kullanici
  // sonsuza kadar donen bir carkla kaliyordu.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['events'] }),
        queryClient.refetchQueries({ queryKey: ['follows'] }),
        queryClient.refetchQueries({ queryKey: ['fixture-health'] }),
      ]);
    } finally {
      // Istek basarisiz olsa da gosterge durmali.
      setRefreshing(false);
    }
  }, [queryClient]);

  // Paylasilan saatten: aksi halde gece yarisi gecildiginde dunun maclari
  // "BUGUN" basligi altinda kalirdi.
  const today = now;
  const tomorrow = days[1];
  const dayLabel = (day: Date) => {
    if (isSameDay(day, today)) return t('home.today');
    if (isSameDay(day, tomorrow)) return t('home.tomorrow');
    return formatDay(day);
  };

  const hasFilters = Boolean(activeFilter || favoritesOnly || liveOnly || selectedDay || leagueFilter || channelFilter || searchTerm.trim());
  const orderIndex = new Map(visibleEvents.map((e, i) => [e.id, i]));

  return (
    <Screen
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onScrollBeginDrag={collapseOnScroll}
    >
      <View className="pt-4">
        <WeekHeader
          term={searchTerm}
          onTermChange={setSearchTerm}
          expanded={searchExpanded}
          onExpandedChange={setSearchExpanded}
        />

        {(sportTabs.length > 1 || hasFavoriteEvents) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-5 -mx-5 px-5"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <SportTab
              label={t('home.allSports')}
              icon="apps"
              active={activeFilter === null}
              onPress={() => setSportFilter(null)}
            />
            {/* Yildiz suzgeci yalnizca yildizli bir macin oldugu haftalarda
                cikar; hicbir sey secmeyen bir dugme gostermenin anlami yok. */}
            {sportTabs.map((sport) => (
              <SportTab
                key={sport.id}
                label={language === 'tr' ? sport.nameTr : sport.nameEn}
                icon={sport.icon}
                active={activeFilter === sport.id}
                onPress={() => setSportFilter(sport.id)}
              />
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <SportTab label={t('home.favoritesOnly')} icon="star-outline" active={favoritesOnly} onPress={() => setFavoritesOnly(value => !value)} />
          <SportTab label={t('home.live')} icon="radio-outline" active={liveOnly} onPress={() => setLiveOnly(value => !value)} />
          <SportTab label={`${t('home.filters')}${leagueFilter || channelFilter ? ` (${Number(Boolean(leagueFilter)) + Number(Boolean(channelFilter))})` : ''}`} icon="options-outline" active={Boolean(leagueFilter || channelFilter)} onPress={() => setFiltersOpen(true)} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {[null, ...days.map((_, i) => i)].map(offset => (
            <Pressable key={offset ?? 'week'} onPress={() => setDayOffset(offset)} accessibilityRole="button" accessibilityState={{ selected: dayOffset === offset }} className={`mr-2 min-h-16 min-w-14 items-center justify-center rounded-2xl border px-3 py-2 ${dayOffset === offset ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}>
              <Text className="text-xs text-ink-secondary">{offset === null ? t('home.week') : offset < 2 ? t(offset === 0 ? 'home.today' : 'home.tomorrow') : days[offset].toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'short' })}</Text>
              <Text className={`mt-1 text-lg font-semibold ${dayOffset === offset ? 'text-primary' : 'text-ink'}`}>{offset === null ? '7' : days[offset].getDate()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <FixtureHealthNotice records={fixtureHealth.data} error={fixtureHealth.isError} now={now} />
        {liveOnly && liveScores.isError && <EmptyCard iconName="radio-outline" message={t('home.liveUnavailable')} />}
        {liveOnly && liveScores.isLoading && <LoadingCard label={t('home.liveLoading')} />}
        <Modal visible={filtersOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFiltersOpen(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View className="flex-row items-center justify-between px-6 py-4">
              <Text accessibilityRole="header" className="text-xl font-bold text-ink">{t('home.filters')}</Text>
              <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} accessibilityLabel={t('common.cancel')} className="min-h-11 min-w-11 items-center justify-center"><Ionicons name="close" size={24} color={colors.ink} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
              {([{ title: t('home.leagueFilter'), options: leagues, value: leagueFilter, set: setLeagueFilter }, { title: t('home.channelFilter'), options: channels, value: channelFilter, set: setChannelFilter }]).map(section => (
                <View key={section.title} className="mb-6">
                  <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-secondary">{section.title}</Text>
                  <View className="flex-row flex-wrap gap-y-2">
                    <SportTab label={t('home.allSports')} active={section.value === null} onPress={() => section.set(null)} />
                    {section.options.map(([id, label]) => <SportTab key={id} label={label} active={section.value === id} onPress={() => section.set(id)} />)}
                  </View>
                </View>
              ))}
              {[{ label: t('home.compact'), flag: compact }, { label: t('home.effects'), flag: effects }].map(({ label, flag }) => (
                <View key={label} className="mb-4 flex-row items-center justify-between gap-4"><Text className="flex-1 text-base text-ink">{label}</Text><Switch accessibilityLabel={label} value={flag.value} onValueChange={flag.toggle} trackColor={{ true: colors.primary }} /></View>
              ))}
            </ScrollView>
            <View className="gap-3 px-6 pb-6">
              <Pressable accessibilityRole="button" onPress={resetFilters} className="min-h-11 items-center justify-center"><Text className="text-primary">{t('home.resetFilters')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} className="items-center rounded-2xl bg-primary p-4"><Text className="font-bold text-white">{t('home.applyFilters')}</Text></Pressable>
            </View>
          </SafeAreaView>
        </Modal>
        {isLoading && <LoadingCard />}
        {error && events.length === 0 && (
          <ErrorCard
            message={error.message}
            onRetry={() => void queryClient.refetchQueries({ queryKey: ['events'] })}
          />
        )}

        {/* Suzgec zaten yalnizca favorileri gosterirken ayni maclari bir de
            tepede tekrarlamanin anlami yok. */}
        {!favoritesOnly && (
          <FavoritesSection
            events={favoriteEvents}
            collapsed={favoritesCollapsed.value}
            onToggleCollapsed={favoritesCollapsed.toggle}
          />
        )}

        {groupByDay(visibleEvents, selectedDay ?? now).map((group) => (
          <View key={group.day.toISOString()} className="mb-2">
            <Text className="mb-1 text-[10px] font-medium tracking-widest text-ink-tertiary">{t('home.eventCount', { count: group.events.length })}</Text>
            <View className="mb-3 flex-row items-center gap-3">
              <Text className="text-base font-bold uppercase tracking-wider text-ink">
                {dayLabel(group.day)}
              </Text>
              <View className="h-px flex-1 bg-line" />
            </View>
            {group.events.map((event) => {
              const generic = espnMatches.get(event.id);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  index={orderIndex.get(event.id) ?? 0}
                  compact={compact.value}
                  effects={effects.value}
                  liveScore={liveMatches.get(event.id)}
                  liveGeneric={
                    generic === 'window'
                      ? { scoreText: null, detail: null }
                      : generic
                        ? { scoreText: espnLiveScoreText(generic), detail: generic.statusDetail }
                        : undefined
                  }
                />
              );
            })}
          </View>
        ))}

        {hasFilters && <Pressable accessibilityRole="button" onPress={resetFilters} className="mb-4 min-h-11 items-center justify-center"><Text className="text-sm font-semibold text-primary">{t('home.resetFilters')}</Text></Pressable>}
        {liveOnly && !liveScores.isLoading && !liveScores.isError && visibleEvents.length === 0 && (
          <EmptyCard iconName="radio-outline" message={t('home.liveEmpty')} />
        )}
        {!liveOnly && !isLoading && !error && visibleEvents.length === 0 && (
          <EmptyCard
            iconName={searchTerm.trim() ? 'search-outline' : 'calendar-outline'}
            message={
              searchTerm.trim()
                ? t('home.searchNoEvents', { term: searchTerm.trim() })
                : t(hasFilters ? 'home.filteredEmpty' : fixtureHealth.hasIssues ? 'home.noVerifiedEvents' : 'home.noEvents')
            }
          />
        )}
      </View>
    </Screen>
  );
}
