import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { RatingPill } from '@/features/events/components/match-stats-card';
import { useFootballPlayer, useFootballPlayerMatches } from '@/features/players/hooks/use-football-players';
import { formatDate, formatDateShort } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { FootballPlayerMatch, FootballSeasonStat } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';

function age(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

function marketValue(eur: number | null): string | null {
  if (eur == null) return null;
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1_000)}K`;
  return `€${eur}`;
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="min-w-[30%] flex-1 rounded-2xl bg-surface-raised px-3 py-2.5">
      <Text className="text-[11px] uppercase tracking-wide text-ink-tertiary">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-ink" numberOfLines={2}>{value}</Text>
    </View>
  );
}

/** Genisleyen sezon satirindaki tek bir mac: rakip, skor, dk, gol/asist, puan. */
function MatchRow({ match }: { match: FootballPlayerMatch }) {
  const { t } = useI18n();
  const router = useRouter();
  const colors = useThemeColors();
  const score =
    match.homeScore != null && match.awayScore != null
      ? `${match.homeScore}–${match.awayScore}`
      : null;
  const ga = [
    match.goals ? `${match.goals}G` : null,
    match.assists ? `${match.assists}A` : null,
  ].filter(Boolean).join(' ');
  const body = (
    <View className="flex-row items-center gap-2 py-2">
      <Text className="w-12 text-xs text-ink-tertiary" numberOfLines={1}>
        {match.date ? formatDateShort(match.date) : '–'}
      </Text>
      <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
        {match.opponentName ?? '–'}
        {match.isHome != null
          ? ` (${match.isHome ? t('footballPlayer.homeMark') : t('footballPlayer.awayMark')})`
          : ''}
      </Text>
      {score != null && (
        <Text className="text-sm font-semibold text-ink">{score}</Text>
      )}
      <Text className="w-9 text-right text-xs text-ink-secondary">
        {match.minutes != null ? `${match.minutes}'` : '–'}
      </Text>
      <Text className="w-10 text-right text-xs font-medium text-ink-secondary">
        {ga || '–'}
      </Text>
      {match.rating != null ? <RatingPill rating={match.rating} /> : <View className="w-9" />}
      {match.eventId != null && (
        <Ionicons name="chevron-forward" size={14} color={colors.inkTertiary} />
      )}
    </View>
  );
  if (match.eventId == null) return body;
  return (
    <Pressable onPress={() => router.push(`/event/${match.eventId}`)} className="active:opacity-60">
      {body}
    </Pressable>
  );
}

/**
 * Bir sezon satiri: takim logosu + lig + mac/gol/asist/puan. seasonId varsa
 * dokununca BSD mac logu acilir; mac satirlari uygulamadaki event'e baglanir.
 */
function SeasonRow({ stat, playerId }: { stat: FootballSeasonStat; playerId: string }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const expandable = stat.seasonId != null;
  const { data: matches, isFetching } = useFootballPlayerMatches(
    open ? playerId : undefined,
    { seasonId: stat.seasonId, leagueId: stat.leagueId, teamId: stat.teamId },
  );
  const cells: (string | number | null)[] = [stat.matches, stat.goals, stat.assists];
  const row = (
    <View className="flex-row items-center gap-2 py-2.5">
      {stat.teamLogoUrl ? (
        <Image source={{ uri: stat.teamLogoUrl }} style={{ width: 20, height: 20 }} contentFit="contain" allowDownscaling={false} />
      ) : (
        <View className="h-5 w-5" />
      )}
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {stat.leagueName ?? stat.teamName ?? '–'}
        </Text>
        {stat.leagueName && stat.teamName && stat.teamName !== stat.leagueName && (
          <Text className="text-xs text-ink-tertiary" numberOfLines={1}>{stat.teamName}</Text>
        )}
      </View>
      {cells.map((value, i) => (
        <Text key={i} className="w-9 text-center text-sm font-semibold text-ink">
          {value ?? '–'}
        </Text>
      ))}
      {stat.avgRating != null ? <RatingPill rating={stat.avgRating} /> : <View className="w-9" />}
      {expandable && (
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.inkTertiary} />
      )}
    </View>
  );
  return (
    <View>
      {expandable ? (
        <Pressable onPress={() => setOpen((v) => !v)} className="active:opacity-60">
          {row}
        </Pressable>
      ) : (
        row
      )}
      {open && (
        <View className="mb-1 rounded-xl bg-surface-raised px-3 py-1">
          {isFetching ? (
            <ActivityIndicator size="small" color={colors.inkTertiary} style={{ marginVertical: 10 }} />
          ) : matches && matches.length > 0 ? (
            matches.map((match, i) => (
              <MatchRow key={match.bsdEventId ?? i} match={match} />
            ))
          ) : (
            <Text className="py-2.5 text-xs text-ink-tertiary">{t('footballPlayer.noMatches')}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function SeasonHeader() {
  const { t } = useI18n();
  const labels = [
    t('footballPlayer.statApps'),
    t('footballPlayer.statGoals'),
    t('footballPlayer.statAssists'),
  ];
  return (
    <View className="flex-row items-center gap-2 border-b border-line pb-1.5">
      <View className="h-5 w-5" />
      <View className="flex-1" />
      {labels.map((label) => (
        <Text key={label} className="w-9 text-center text-[10px] font-semibold uppercase text-ink-tertiary" numberOfLines={1}>
          {label}
        </Text>
      ))}
      <Text className="w-9 text-center text-[10px] font-semibold uppercase text-ink-tertiary">
        {t('footballPlayer.statRating')}
      </Text>
      <View className="w-3.5" />
    </View>
  );
}

/** Ayni sezona ait satirlari tek baslik altinda toplar ("2026/27"). */
function SeasonGroup({ label, stats, playerId }: { label: string | null; stats: FootballSeasonStat[]; playerId: string }) {
  return (
    <View>
      {label != null && (
        <Text className="mt-1.5 text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          {label}
        </Text>
      )}
      {stats.map((stat, i) => (
        <SeasonRow key={`${stat.leagueId}-${stat.teamId}-${stat.seasonId ?? i}`} stat={stat} playerId={playerId} />
      ))}
    </View>
  );
}

/**
 * Futbolcu profili: kimlik/fiziksel bilgiler ve lig basina sezon istatistikleri.
 * Veri BSD'den canli gelir (player-bsd-data); oyuncular veritabaninda tutulmaz.
 */
export default function FootballPlayerScreen() {
  const { bsdId } = useLocalSearchParams<{ bsdId: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();

  const { data: player, isLoading, isError, refetch } = useFootballPlayer(bsdId);

  if (isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <LoadingCard />
      </Screen>
    );
  }
  if (isError) {
    return <Screen><ErrorCard message={t('common.somethingWentWrong')} onRetry={() => void refetch()} /></Screen>;
  }
  if (!player) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyCard message={t('footballPlayer.notFound')} />
      </Screen>
    );
  }

  const years = age(player.dateOfBirth);
  const positionLabels: Record<string, string> = {
    G: t('footballPlayer.pos.G'),
    D: t('footballPlayer.pos.D'),
    M: t('footballPlayer.pos.M'),
    F: t('footballPlayer.pos.F'),
  };
  const positionLabel = player.position
    ? positionLabels[player.position] ?? player.specificPosition ?? player.position
    : player.specificPosition;
  const foot = player.preferredFoot === 'L' ? t('footballPlayer.footLeft')
    : player.preferredFoot === 'R' ? t('footballPlayer.footRight')
    : player.preferredFoot;
  const availabilityLabels: Record<string, string> = {
    available: t('footballPlayer.avail.available'),
    injured: t('footballPlayer.avail.injured'),
    doubtful: t('footballPlayer.avail.doubtful'),
    suspended: t('footballPlayer.avail.suspended'),
  };
  const injured = player.availability && player.availability !== 'available';
  const current = player.seasons.filter((s) => s.isCurrent);
  const currentLabel = current.find((s) => s.seasonLabel)?.seasonLabel ?? null;
  // Gecmis sezonlar etikete gore gruplanir; etiketi olmayanlar sona duser.
  const past = player.seasons
    .filter((s) => !s.isCurrent)
    .sort((a, b) => (b.seasonLabel ?? '').localeCompare(a.seasonLabel ?? ''));
  const pastGroups: { label: string | null; stats: FootballSeasonStat[] }[] = [];
  for (const stat of past) {
    const last = pastGroups[pastGroups.length - 1];
    if (last && last.label === stat.seasonLabel) last.stats.push(stat);
    else pastGroups.push({ label: stat.seasonLabel, stats: [stat] });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: player.shortName ?? player.name }} />
      <View className="pt-4">
        <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface p-5">
          <LinearGradient colors={[`${colors.primary}25`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <View className="flex-row items-center gap-4">
            {player.photoUrl ? (
              <Image source={{ uri: player.photoUrl }} style={{ width: 84, height: 104 }} contentFit="contain" allowDownscaling={false} />
            ) : (
              <View className="h-[104px] w-[84px] items-center justify-center rounded-2xl bg-surface-raised">
                <Ionicons name="person" size={36} color={colors.inkTertiary} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-2xl font-semibold tracking-tight text-ink" numberOfLines={3}>
                {player.name}
              </Text>
              <View className="mt-1.5 flex-row items-center gap-1.5">
                {player.teamLogoUrl && (
                  <Image source={{ uri: player.teamLogoUrl }} style={{ width: 18, height: 18 }} contentFit="contain" allowDownscaling={false} />
                )}
                <Text className="text-sm text-ink-secondary" numberOfLines={1}>
                  {[player.jerseyNumber != null ? `#${player.jerseyNumber}` : null, player.teamName, positionLabel].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {injured && (
                <View className="mt-2 self-start rounded-lg bg-danger/15 px-2 py-1">
                  <Text className="text-xs font-semibold text-danger">
                    {availabilityLabels[player.availability ?? ''] ?? player.availability}
                    {player.injuryExpectedReturn
                      ? ` · ${t('footballPlayer.injuryReturn', { date: formatDate(player.injuryExpectedReturn) })}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Fact label={t('footballPlayer.nationality')} value={player.nationality} />
            <Fact
              label={t('footballPlayer.born')}
              value={player.dateOfBirth ? `${formatDate(player.dateOfBirth)}${years != null ? ` (${years})` : ''}` : null}
            />
            <Fact label={t('footballPlayer.height')} value={player.heightCm != null ? `${player.heightCm} cm` : null} />
            <Fact label={t('footballPlayer.weight')} value={player.weightKg != null ? `${player.weightKg} kg` : null} />
            <Fact label={t('footballPlayer.foot')} value={foot} />
            <Fact label={t('footballPlayer.marketValue')} value={marketValue(player.marketValueEur)} />
            <Fact label={t('footballPlayer.contract')} value={player.contractUntil ? formatDate(player.contractUntil) : null} />
          </View>
        </View>

        {current.length > 0 && (
          <Card className="mb-4" index={1}>
            <SectionHeader
              icon="stats-chart"
              label={`${t('footballPlayer.thisSeason')}${currentLabel ? ` · ${currentLabel}` : ''}`}
              tint={colors.primary}
            />
            <SeasonHeader />
            {current.map((stat) => (
              <SeasonRow key={`${stat.leagueId}-${stat.teamId}`} stat={stat} playerId={player.id} />
            ))}
          </Card>
        )}

        {pastGroups.length > 0 && (
          <Card className="mb-4" index={2}>
            <SectionHeader icon="time" label={t('footballPlayer.career')} tint={colors.primary} />
            <SeasonHeader />
            {pastGroups.map((group, i) => (
              <SeasonGroup key={group.label ?? `season-${i}`} label={group.label} stats={group.stats} playerId={player.id} />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
