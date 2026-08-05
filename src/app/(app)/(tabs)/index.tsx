import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { useSports } from '@/features/catalog/hooks/use-catalog';
import { EventCard, FeaturedEventCard } from '@/features/events/components/event-card';
import { WeekHeader } from '@/features/events/components/week-header';
import { useUpcomingEvents } from '@/features/events/hooks/use-events';
import { useFollows } from '@/features/follows/hooks/use-follows';
import { formatDay, isSameDay } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { useNow } from '@/lib/now';
import { matchesAny, searchNeedles } from '@/lib/search';
import type { Sport, SportEvent } from '@/types';

/** Groups events by calendar day (local timezone), keeping order. */
function groupByDay(events: SportEvent[]): { day: Date; events: SportEvent[] }[] {
  const groups: { day: Date; events: SportEvent[] }[] = [];
  for (const event of events) {
    const day = new Date(event.startsAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, day)) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
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
      className={`mr-2 flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
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
  const { events, isLoading, error } = useUpcomingEvents(7);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

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

  const visibleEvents = useMemo(
    () => (activeFilter ? searchedEvents.filter((e) => e.sportId === activeFilter) : searchedEvents),
    [searchedEvents, activeFilter],
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
      ]);
    } finally {
      // Istek basarisiz olsa da gosterge durmali.
      setRefreshing(false);
    }
  }, [queryClient]);

  // Paylasilan saatten: aksi halde gece yarisi gecildiginde dunun maclari
  // "BUGUN" basligi altinda kalirdi.
  const today = now;
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const dayLabel = (day: Date) => {
    if (isSameDay(day, today)) return t('home.today');
    if (isSameDay(day, tomorrow)) return t('home.tomorrow');
    return formatDay(day);
  };

  const featuredId = visibleEvents.find((e) => e.status === 'scheduled')?.id;
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

        {sportTabs.length > 1 && (
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

        {isLoading && <LoadingCard />}
        {error && events.length === 0 && (
          <ErrorCard
            message={error.message}
            onRetry={() => void queryClient.refetchQueries({ queryKey: ['events'] })}
          />
        )}

        {groupByDay(visibleEvents).map((group) => (
          <View key={group.day.toISOString()} className="mb-2">
            <View className="mb-3 flex-row items-center gap-3">
              <Text className="text-base font-bold uppercase tracking-wider text-ink">
                {dayLabel(group.day)}
              </Text>
              <View className="h-px flex-1 bg-line" />
            </View>
            {group.events.map((event) =>
              event.id === featuredId ? (
                <FeaturedEventCard
                  key={event.id}
                  event={event}
                  index={orderIndex.get(event.id) ?? 0}
                />
              ) : (
                <EventCard
                  key={event.id}
                  event={event}
                  index={orderIndex.get(event.id) ?? 0}
                />
              ),
            )}
          </View>
        ))}

        {!isLoading && !error && visibleEvents.length === 0 && (
          <EmptyCard
            iconName={searchTerm.trim() ? 'search-outline' : 'calendar-outline'}
            message={
              searchTerm.trim()
                ? t('home.searchNoEvents', { term: searchTerm.trim() })
                : t('home.noEvents')
            }
          />
        )}
      </View>
    </Screen>
  );
}
