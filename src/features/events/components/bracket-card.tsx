import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { useThemeColors } from '@/constants/theme';
import { fetchTournamentBracket } from '@/services/events';
import { formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { SportEvent } from '@/types';

/** Turlar kronolojik degil alfabetik gelebiliyor; okunur bir sira icin. */
const ROUND_ORDER = ['1st Round', '2nd Round', '3rd Round', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];

function roundRank(round: string | null | undefined): number {
  if (!round) return ROUND_ORDER.length;
  const index = ROUND_ORDER.findIndex((name) => round.includes(name));
  return index === -1 ? ROUND_ORDER.length : index;
}

function PlayerLine({
  name,
  flagUrl,
  rank,
}: {
  name: string | null | undefined;
  flagUrl: string | null | undefined;
  rank: number | null | undefined;
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
      <Text className="shrink text-sm font-medium text-ink" numberOfLines={1}>
        {name ?? '—'}
      </Text>
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
export function BracketCard({ event, index = 0 }: { event: SportEvent; index?: number }) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const { data: matches } = useQuery({
    queryKey: ['bracket', event.id],
    queryFn: () => fetchTournamentBracket(event.id),
    // Yalnizca cok gunlu bireysel spor etkinliklerinde kura var.
    enabled: event.sportId === 'tennis',
    staleTime: 5 * 60_000,
  });

  if (!matches || matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => {
    const byRound = roundRank(b.round) - roundRank(a.round);
    return byRound !== 0 ? byRound : a.startsAt.localeCompare(b.startsAt);
  });

  return (
    <Card className="mb-4" index={index}>
      <SectionHeader icon="git-network" label={t('event.bracket')} tint={colors.primary} />
      <View className="gap-2">
        {sorted.map((match) => (
          <Link key={match.id} href={`/event/${match.id}`} asChild>
            <Pressable className="rounded-2xl bg-surface-raised px-3 py-2.5 active:opacity-70">
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
              />
              <View className="my-1 h-px bg-line" />
              <PlayerLine
                name={match.awayTeamName}
                flagUrl={match.awayTeamLogoUrl}
                rank={match.awayPlayerRank}
              />
            </Pressable>
          </Link>
        ))}
      </View>
    </Card>
  );
}
