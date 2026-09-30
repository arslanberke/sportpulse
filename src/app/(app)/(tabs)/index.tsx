import { calendarDays, currentCalendarEvents, filterCalendarEvents, groupCalendarEvents } from '@/features/events/lib/calendar-view';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
import { useSports } from '@/features/catalog/hooks/use-catalog';
import { Timeline, timelineSlots } from '@/features/events/components/timeline';
import { TimelineCard, liveFromScore, liveFromText, type TimelineLive } from '@/features/events/components/timeline-card';
import { WeekHeader } from '@/features/events/components/week-header';
import { useLiveScores, useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useFixtureHealth } from '@/features/events/hooks/use-fixture-health';
import { espnLiveScoreText, matchEspnLive, matchLiveScores } from '@/features/events/lib/live-match';
import { isFavoriteEvent, useFavorites } from '@/features/follows/hooks/use-favorites';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { formatDay, formatWeekdayShort, isSameDay } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { useNow } from '@/lib/now';
import { matchesAny, searchNeedles } from '@/lib/search';
import type { Sport, SportEvent } from '@/types';

/** Son 3 saatte baslamis mac canli akista bulunabilir; daha eskisi bitmistir. */
const LIVE_LOOKBACK_MS = 3 * 60 * 60 * 1000;

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
          color={active ? colors.onPrimary : colors.inkSecondary}
        />
      )}
      <Text
        className={`text-sm font-semibold ${active ? 'text-on-primary' : 'text-ink-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Filtre seridi cipi: acik ton, secilince murekkep zemin. */
function Chip({
  label,
  active,
  onPress,
  accessibilityLabel,
  leading,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      className={`mr-1.5 h-9 flex-row items-center gap-1 rounded-full px-3 ${
        active ? 'bg-ink' : 'border border-line bg-surface'
      }`}
    >
      {leading}
      <Text className={`text-xs font-semibold ${active ? 'text-background' : 'text-ink-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Ana ekran: telefonu acan kisi o an izleyebilecegi bir sey var mi diye bakar.
 * Gunun etkinlikleri saate gore akar; baslamis olanlar "Simdi" diliminde,
 * kalanlar sirayla. "Hafta" tum haftayi gun gun listeler.
 */
export default function HomeScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: follows, isFetched: followsFetched } = useFollows();
  const { data: sports } = useSports();
  // Son 3 saatte baslamis maclar da ham adaylarda tutulur: canli akis
  // dogrularsa "Simdi" diliminde kalirlar, dogrulamazsa listeden duserler.
  const { events, isLoading, error } = useUpcomingEvents(7, 3);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // null: tum hafta gun gun; 0..6: gun seridinden secilen gun.
  const [dayOffset, setDayOffset] = useState<number | null>(0);
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const colors = useThemeColors();
  const now = useNow();
  const days = calendarDays(now);
  // Arama secili gunle sinirli kalmaz: aranan mac cumartesiyse "Bugun"
  // seciliyken de bulunmali. Terim varken tum hafta taranir, sonuclar gun gun
  // listelenir ve terim silinince secili gune donulur.
  const searching = searchTerm.trim() !== '';
  const weekActive = dayOffset === null || searching;
  const selectedDay = weekActive ? null : days[dayOffset ?? 0];
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const fixtureHealth = useFixtureHealth(follows, favoritePlayerIds);
  const [liveOnly, setLiveOnly] = useState(false);

  // Canli akis yalnizca su an oynaniyor olabilecek bir mac varken sorgulanir;
  // sunucu tarafi 45 sn'lik ortak onbellek yuzunden ek kota harcamaz.
  const hasLiveCandidates = useMemo(
    () => events.some((e) => {
      const starts = new Date(e.startsAt).getTime();
      const ends = e.endsAt ? new Date(e.endsAt).getTime() : starts + LIVE_LOOKBACK_MS;
      return starts <= now.getTime() && ends > now.getTime();
    }),
    [events, now],
  );
  const liveScores = useLiveScores(liveOnly || hasLiveCandidates);
  const liveMatches = useMemo(
    () => matchLiveScores(events, liveScores.data?.scores ?? []),
    [events, liveScores.data],
  );
  // Futbol disi canlilar (NBA, tenis, F1, UFC) ESPN akisindan; motogp ve
  // kaynagin kaciridigi f1 seanslari saat penceresiyle 'window' isaretlenir.
  const espnMatches = useMemo(
    () => matchEspnLive(events, liveScores.data?.espn ?? []),
    [events, liveScores.data],
  );
  const isLive = useCallback(
    (event: SportEvent) => liveMatches.has(event.id) || espnMatches.has(event.id),
    [liveMatches, espnMatches],
  );
  const liveFor = useCallback(
    (event: SportEvent): TimelineLive | undefined => {
      const score = liveMatches.get(event.id);
      if (score) return liveFromScore(score, t('event.halfTime'));
      const generic = espnMatches.get(event.id);
      if (generic === 'window') return { home: null, away: null, detail: null };
      if (generic) return liveFromText(espnLiveScoreText(generic), generic.statusDetail);
      return undefined;
    },
    [liveMatches, espnMatches, t],
  );

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

  const isFavorite = (event: SportEvent) => isFavoriteEvent(event, favoriteTeamIds, favoritePlayerIds);
  const filteredEvents = filterCalendarEvents(searchedEvents, {
    sportId: activeFilter, leagueId: leagueFilter, channelId: channelFilter,
  }, isFavorite);
  // Takvim baslamis maclari dusurur; canli akisin dogruladiklari geri eklenir
  // ki "Simdi" dilimi bos kalmasin.
  const liveEvents = filteredEvents.filter(isLive);
  const weekEvents = [
    ...liveEvents,
    ...currentCalendarEvents(filteredEvents, now).filter((e) => !isLive(e)),
  ];
  // Yildiz cipindeki sayi suzgecten bagimsiz sayilir; kapatan kullanici cipi
  // de kaybetmesin.
  const favoriteCount = weekEvents.filter(isFavorite).length;
  const liveCount = liveEvents.length;
  const calendarWeekEvents = favoritesOnly ? weekEvents.filter(isFavorite) : weekEvents;
  const visibleEvents = liveOnly
    ? calendarWeekEvents.filter(isLive)
    : filterCalendarEvents(calendarWeekEvents, { day: selectedDay }, () => true);
  const leagues = [...new Map(events.filter(e => e.leagueId && e.leagueName).map(e => [e.leagueId!, e.leagueName!])).entries()];
  const channels = [...new Map(events.flatMap(e => e.channels ?? []).map(c => [c.id, c.name])).entries()];
  const resetFilters = () => {
    setSportFilter(null);
    setFavoritesOnly(false);
    setLiveOnly(false);
    setDayOffset(0);
    setLeagueFilter(null);
    setChannelFilter(null);
    setSearchTerm('');
  };

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
        queryClient.refetchQueries({ queryKey: ['live-scores'] }),
      ]);
    } finally {
      // Istek basarisiz olsa da gosterge durmali.
      setRefreshing(false);
    }
  }, [queryClient]);

  const locale = language === 'tr' ? 'tr-TR' : 'en-GB';
  const dayName = (day: Date) => {
    if (isSameDay(day, days[0])) return t('home.today');
    if (isSameDay(day, days[1])) return t('home.tomorrow');
    return day.toLocaleDateString(locale, { weekday: 'long' });
  };
  const longDate = (day: Date) => day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const title = liveOnly ? t('home.live') : weekActive ? t('home.week') : dayName(selectedDay!);
  const subtitle = weekActive
    ? `${formatDay(days[0])} – ${formatDay(days[6])}`
    : longDate(selectedDay ?? now);

  const hasFilters = Boolean(activeFilter || favoritesOnly || liveOnly || weekActive || dayOffset !== 0 || leagueFilter || channelFilter || searchTerm.trim());
  const weekGroups = groupCalendarEvents(visibleEvents, now);
  const slots = timelineSlots(visibleEvents, now, t('home.now'));
  const showEmpty = !isLoading && !error && visibleEvents.length === 0;
  // Arama sonuclarinda bos gunler listelenmez; hicbiri yoksa asagidaki bos
  // durum karti gosterilir.
  const weekDays = searching
    ? days.filter((day) => weekGroups.some((g) => isSameDay(g.day, day)))
    : days;

  return (
    <Screen onRefresh={handleRefresh} refreshing={refreshing}>
      <View className="pt-4">
        <WeekHeader
          title={title}
          subtitle={subtitle}
          term={searchTerm}
          onTermChange={setSearchTerm}
          expanded={searchExpanded}
          onExpandedChange={setSearchExpanded}
          weekActive={dayOffset === null}
          onToggleWeek={() => setDayOffset(dayOffset === null ? 0 : null)}
        />

        {!searching && (
          <View className="mb-2.5 flex-row" style={{ gap: 6 }}>
            {days.map((day, offset) => {
              const on = dayOffset === offset;
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => setDayOffset(offset)}
                  accessibilityRole="button"
                  accessibilityLabel={longDate(day)}
                  accessibilityState={{ selected: on }}
                  className={`flex-1 items-center rounded-2xl py-1.5 ${on ? 'border border-line bg-surface' : ''}`}
                >
                  <Text className={`text-[10px] ${on ? 'font-bold text-primary' : 'font-medium text-ink-secondary'}`}>
                    {formatWeekdayShort(day)}
                  </Text>
                  <Text className="mt-px text-[15px] font-bold text-ink">{day.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
          <Chip
            label={t('home.allSports')}
            active={activeFilter === null && !favoritesOnly && !liveOnly}
            onPress={() => { setSportFilter(null); setFavoritesOnly(false); setLiveOnly(false); }}
          />
          {(favoriteCount > 0 || favoritesOnly) && (
            <Chip
              label={String(favoriteCount)}
              accessibilityLabel={t('home.favoritesOnly')}
              active={favoritesOnly}
              onPress={() => setFavoritesOnly((value) => !value)}
              leading={<Ionicons name="star" size={12} color={FAVORITE_COLOR} />}
            />
          )}
          <Chip
            label={liveCount > 0 ? `${t('home.live')} ${liveCount}` : t('home.live')}
            active={liveOnly}
            onPress={() => setLiveOnly((value) => !value)}
            leading={<View className="h-1.5 w-1.5 rounded-full bg-live" />}
          />
          {sportTabs.length > 1 && sportTabs.map((sport) => (
            <Chip
              key={sport.id}
              label={language === 'tr' ? sport.nameTr : sport.nameEn}
              active={activeFilter === sport.id}
              onPress={() => setSportFilter(activeFilter === sport.id ? null : sport.id)}
            />
          ))}
          <Chip
            label={`${t('home.filters')}${leagueFilter || channelFilter ? ` (${Number(Boolean(leagueFilter)) + Number(Boolean(channelFilter))})` : ''}`}
            active={Boolean(leagueFilter || channelFilter)}
            onPress={() => setFiltersOpen(true)}
            leading={<Ionicons name="options-outline" size={13} color={leagueFilter || channelFilter ? colors.background : colors.inkSecondary} />}
          />
        </ScrollView>

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
            </ScrollView>
            <View className="gap-3 px-6 pb-6">
              <Pressable accessibilityRole="button" onPress={resetFilters} className="min-h-11 items-center justify-center"><Text className="text-primary">{t('home.resetFilters')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} className="items-center rounded-2xl bg-primary p-4"><Text className="font-bold text-on-primary">{t('home.applyFilters')}</Text></Pressable>
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

        {weekActive && !liveOnly ? (
          <View className="mt-1">
            {weekDays.map((day) => {
              const group = weekGroups.find((g) => isSameDay(g.day, day));
              const today = isSameDay(day, now);
              return (
                <View key={day.toISOString()}>
                  <View className="mx-0.5 mt-4 flex-row items-baseline border-b border-line pb-1.5" style={{ gap: 8 }}>
                    <Text className={`text-sm font-extrabold ${today ? 'text-primary' : 'text-ink'}`}>{dayName(day)}</Text>
                    <Text className={`flex-1 text-[11px] font-semibold ${today ? 'text-primary' : 'text-ink-secondary'}`}>{formatDay(day)}</Text>
                    <Text className="text-[11px] font-bold text-ink-tertiary" style={{ fontVariant: ['tabular-nums'] }}>
                      {group ? t('home.eventCount', { count: group.events.length }) : ''}
                    </Text>
                  </View>
                  {group ? (
                    group.events.map((event, i) => (
                      <TimelineCard key={event.id} event={event} live={liveFor(event)} first={i === 0} />
                    ))
                  ) : (
                    !isLoading && (
                      <Text className="mt-2 rounded-2xl border border-dashed border-line p-3 text-center text-xs text-ink-tertiary">
                        {t('home.dayEmpty')}
                      </Text>
                    )
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          slots.length > 0 && <Timeline slots={slots} liveFor={liveFor} />
        )}

        {hasFilters && <Pressable accessibilityRole="button" onPress={resetFilters} className="mb-4 mt-2 min-h-11 items-center justify-center"><Text className="text-sm font-semibold text-primary">{t('home.resetFilters')}</Text></Pressable>}
        {liveOnly && !liveScores.isLoading && !liveScores.isError && visibleEvents.length === 0 && (
          <EmptyCard iconName="radio-outline" message={t('home.liveEmpty')} />
        )}
        {!liveOnly && (searching || !weekActive) && showEmpty && (
          <EmptyCard
            iconName={searchTerm.trim() ? 'search-outline' : 'calendar-outline'}
            message={
              searchTerm.trim()
                ? t('home.searchNoEvents', { term: searchTerm.trim() })
                : t(hasFilters && dayOffset === 0 ? 'home.filteredEmpty' : dayOffset !== 0 ? 'home.dayEmpty' : fixtureHealth.hasIssues ? 'home.noVerifiedEvents' : 'home.noEvents')
            }
          />
        )}
      </View>
    </Screen>
  );
}
