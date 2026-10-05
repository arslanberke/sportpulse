import { ErrorCard, LoadingCard } from '@/components/ui/states';
import { filterBracketMatches, type BracketFilters } from '@/features/events/lib/calendar-view';
import { useNow } from '@/lib/now';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { FlatHeader, SectionHeader } from '@/components/ui/section-header';
import { useThemeColors } from '@/constants/theme';
import { formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { fetchTournamentBracket } from '@/services/events';
import type { SportEvent } from '@/types';

function DrawOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} className={`mr-2 min-h-11 justify-center rounded-full border px-3 ${active ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}><Text className={`text-xs font-medium ${active ? 'text-primary' : 'text-ink-secondary'}`}>{label}</Text></Pressable>;
}

/**
 * Turun onemi: buyuk sayi daha onemli.
 *
 * Kaynak turlari kronolojik sirada vermiyor ve eleme maclari ana tabloyla ayni
 * listede geliyor. Onem sirasi kullanilmadiginda kartin tepesinde "eleme 1. tur"
 * duruyor, ceyrek final asagida kaliyor.
 */
const ROUND_WEIGHT: [string, number][] = [
  ['Final', 7],
  ['Semifinal', 6],
  ['Quarterfinal', 5],
  ['Round of 16', 4],
  ['3rd Round', 3],
  ['2nd Round', 2],
  ['1st Round', 1],
];

function roundWeight(round: string | null | undefined): number {
  if (!round) return 0;
  // Eleme turlari ana tablonun altinda kalir: "Qualifying Final" bir final
  // degil, ana tabloya girme macidir.
  const qualifying = /qualif/i.test(round);
  const match = ROUND_WEIGHT.find(([name]) => round.includes(name));
  const weight = match ? match[1] : 0;
  return qualifying ? weight - 10 : weight;
}

function PlayerLine({
  name,
  flagUrl,
  rank,
  playerId,
}: {
  name: string | null | undefined;
  flagUrl: string | null | undefined;
  rank: number | null | undefined;
  playerId?: string | null;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-2">
      {flagUrl ? (
        <Image
          source={{ uri: flagUrl }}
          style={{ width: 20, height: 14 }}
          contentFit="contain"
          allowDownscaling={false}
        />
      ) : (
        <Ionicons name="person-outline" size={14} color={colors.inkTertiary} />
      )}
      {playerId ? <Link href={`/player/${playerId}`} asChild><Pressable className="min-h-11 flex-1 justify-center"><Text className="text-sm font-medium text-ink" numberOfLines={2}>{name ?? '—'}</Text></Pressable></Link> : <Text className="flex-1 py-3 text-sm font-medium text-ink">{name ?? '—'}</Text>}
      {/* Sira yalnizca siralamada olan oyuncularda var; kalanlarda bos kalir. */}
      {rank != null && (
        <Text className="text-xs font-semibold text-ink-tertiary">#{rank}</Text>
      )}
    </View>
  );
}

/**
 * Turnuvanin kurasi.
 *
 * Ana ekranda turnuvanin kendisi duruyor, karsilasmalar burada: bir tenis
 * turnuvasi yuzlerce mac demek (Toronto 217) ve hepsini listeye koymak takip
 * edilen futbol maclarini bogardi.
 *
 * Eleme turlari ve ciftler suzuluyor (bkz. `fetchTournamentBracket`).
 */
export function BracketCard({ event, index = 0, flat = false }: { event: SportEvent; index?: number; flat?: boolean }) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const now = useNow();
  const [filters, setFilters] = useState<BracketFilters>({ time: 'upcoming' });
  const { data: matches, isLoading, isError, refetch } = useQuery({
    queryKey: ['bracket', event.id],
    queryFn: () => fetchTournamentBracket(event.id),
    // Yalnizca cok gunlu bireysel spor etkinliklerinde kura var.
    enabled: event.sportId === 'tennis',
    staleTime: 5 * 60_000,
  });

  if (event.sportId !== 'tennis' || event.parentEventId) return null;
  const categories = [...new Set((matches ?? []).map(match => match.bracket).filter((value): value is string => Boolean(value)))];
  const rounds = [...new Set((matches ?? []).filter(match => filters.qualifying || !/qualif/i.test(match.round ?? '')).map(match => match.round).filter((value): value is string => Boolean(value)))].sort((a, b) => roundWeight(b) - roundWeight(a));
  const sorted = filterBracketMatches(matches ?? [], filters, now).sort((a, b) => {
    const byRound = roundWeight(b.round) - roundWeight(a.round);
    return byRound !== 0 ? byRound : a.startsAt.localeCompare(b.startsAt);
  });

  return (
    <Card className="mb-4" index={index} flat={flat}>
      {flat ? <FlatHeader label={t('event.bracket')} /> : <SectionHeader icon="git-network" label={t('event.bracket')} tint={colors.primaryDark} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <DrawOption label={t('home.allSports')} active={!filters.category} onPress={() => setFilters(value => ({ ...value, category: null }))} />
        {categories.map(category => <DrawOption key={category} label={category} active={filters.category === category} onPress={() => setFilters(value => ({ ...value, category }))} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {(['upcoming', 'today', 'all', 'results'] as const).map(time => <DrawOption key={time} label={t(time === 'upcoming' ? 'draw.upcoming' : time === 'today' ? 'home.today' : time === 'all' ? 'home.allSports' : 'draw.results')} active={filters.time === time} onPress={() => setFilters(value => ({ ...value, time }))} />)}
      </ScrollView>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">{t('draw.round')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <DrawOption label={t('home.allSports')} active={!filters.round} onPress={() => setFilters(value => ({ ...value, round: null }))} />
        {rounds.map(round => <DrawOption key={round} label={round} active={filters.round === round} onPress={() => setFilters(value => ({ ...value, round }))} />)}
      </ScrollView>
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-ink-secondary">{t('draw.qualifying')}</Text>
        <Switch accessibilityLabel={t('draw.qualifying')} value={Boolean(filters.qualifying)} onValueChange={qualifying => setFilters(value => ({ ...value, qualifying, round: null }))} trackColor={{ true: colors.primary }} />
      </View>
      {isLoading && <LoadingCard />}
      {isError && <ErrorCard message={t('common.somethingWentWrong')} onRetry={() => void refetch()} />}
      {!isLoading && !isError && sorted.length === 0 && <Text className="py-4 text-sm leading-6 text-ink-secondary">{t(filters.time === 'results' ? 'draw.resultsUnavailable' : 'draw.empty')}</Text>}
      <View className="gap-2">
        {sorted.map((match) => (
            <View key={match.id} className="rounded-2xl border border-line bg-surface-raised px-3 py-3">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
                  {match.round ?? ''}
                </Text>
                <Text className="text-xs text-ink-tertiary">{formatDayTime(match.startsAt)}</Text>
              </View>
              <PlayerLine
                name={match.homeTeamName}
                flagUrl={match.homeTeamLogoUrl}
                rank={match.homePlayerRank}
                playerId={match.homePlayerId}
              />
              <View className="my-1 h-px bg-line" />
              <PlayerLine
                name={match.awayTeamName}
                flagUrl={match.awayTeamLogoUrl}
                rank={match.awayPlayerRank}
                playerId={match.awayPlayerId}
              />
              <Link href={`/event/${match.id}`} asChild><Pressable className="min-h-11 flex-row items-center justify-end gap-1"><Text className="text-xs text-primary">{t('home.matchDetails')}</Text><Ionicons name="chevron-forward" size={12} color={colors.primaryDark} /></Pressable></Link>
            </View>
        ))}
      </View>
    </Card>
  );
}
