import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { useThemeColors } from '@/constants/theme';
import { useEventLive, useLiveScores } from '@/features/events/hooks/use-events';
import { matchEspnLive, matchLiveScores, resolveMatchCentre } from '@/features/events/lib/live-match';
import { toMatchEventRows, type MatchEventRow } from '@/features/events/lib/match-events';
import { useI18n, type Translate } from '@/lib/i18n';
import { FINAL_STATUSES, LIVE_STATUSES } from '@/services/providers/api-sports-fixture';
import type { SportEvent } from '@/types';

const ICONS: Record<MatchEventRow['icon'], keyof typeof Ionicons.glyphMap> = {
  goal: 'football',
  penalty: 'football',
  'own-goal': 'football',
  'yellow-card': 'square',
  'red-card': 'square',
  substitution: 'swap-horizontal',
  other: 'information-circle-outline',
};

function EventIcon({ icon }: { icon: MatchEventRow['icon'] }) {
  const colors = useThemeColors();
  const color = icon === 'yellow-card' ? '#F5A524' : icon === 'red-card' ? colors.danger
    : icon === 'goal' || icon === 'penalty' || icon === 'own-goal' ? colors.primary : colors.inkTertiary;
  return <Ionicons name={ICONS[icon]} size={14} color={color} />;
}

function EventRow({ row, t }: { row: MatchEventRow; t: Translate }) {
  const suffix = row.icon === 'own-goal' ? ` (${t('event.ownGoal')})` : row.icon === 'penalty' ? ' (P)' : '';
  const body = (
    <View className={`flex-1 flex-row items-center gap-2 ${row.isHome ? '' : 'justify-end'}`}>
      {row.isHome && <EventIcon icon={row.icon} />}
      <View className={row.isHome ? '' : 'items-end'}>
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>{row.title}{suffix}</Text>
        {row.subtitle && <Text className="text-xs text-ink-tertiary" numberOfLines={1}>{row.subtitle}</Text>}
      </View>
      {!row.isHome && <EventIcon icon={row.icon} />}
    </View>
  );
  return (
    <View className="flex-row items-center gap-3">
      {row.isHome ? body : <View className="flex-1" />}
      <Text className="w-10 text-center text-xs font-semibold text-ink-tertiary">{row.minuteLabel}</Text>
      {row.isHome ? <View className="flex-1" /> : body}
    </View>
  );
}

/**
 * Match-centre card: current score/minute plus a FlashScore-style events
 * timeline (goals, cards, substitutions). Only renders for the five leagues
 * `event-live` actually covers, and only from kickoff onward — never shows a
 * fabricated score for a match that hasn't started.
 */
export function LiveMatchCard({ event, index }: { event: SportEvent; index?: number }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const detailed = useEventLive(event);
  // The aggregated feed is always consulted for football: `event-live` can
  // answer with a stale cached state (or not cover the league at all), while
  // BSD/ESPN/API-Sports in `live-scores` know the match is still being played.
  // A live aggregate signal outranks a final-looking detail snapshot.
  const aggregate = useLiveScores(event.sportId === 'football');
  const aggregateScore = matchLiveScores([event], aggregate.data?.scores ?? []).get(event.id) ?? null;
  const feedHit = matchEspnLive([event], aggregate.data?.espn ?? []).get(event.id);
  const feedEntry = feedHit && feedHit !== 'window' ? feedHit : null;
  const live = resolveMatchCentre(detailed.data ?? null, aggregateScore, feedEntry);
  const isError = detailed.isError && aggregate.isError;

  if (!live) return null;
  const rows = toMatchEventRows(live.events);
  const isLive = LIVE_STATUSES.has(live.status);
  const isFinal = FINAL_STATUSES.has(live.status);

  return (
    <Card className="mb-4" index={index}>
      <SectionHeader icon="pulse" label={t('event.matchCentre')} tint={colors.primaryDark} />
      <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-surface-raised px-4 py-3">
        <Text className="flex-1 text-sm font-semibold text-ink" numberOfLines={1}>{event.homeTeamName}</Text>
        <View className="items-center px-3">
          <Text className="text-2xl font-bold text-ink">{live.homeScore ?? '–'} : {live.awayScore ?? '–'}</Text>
          {isLive ? (
            <View className="mt-1 flex-row items-center gap-1">
              <View className="h-1.5 w-1.5 rounded-full bg-danger" />
              <Text className="text-xs font-semibold text-danger">
                {live.status === 'HT'
                  ? t('event.halfTime')
                  : live.elapsed !== null
                    ? `${live.elapsed}'`
                    : t('home.live')}
              </Text>
            </View>
          ) : isFinal ? (
            <Text className="mt-1 text-xs font-medium text-ink-tertiary">{t('event.fullTime')}</Text>
          ) : null}
        </View>
        <Text className="flex-1 text-right text-sm font-semibold text-ink" numberOfLines={1}>{event.awayTeamName}</Text>
      </View>

      {rows.length > 0 ? (
        <View className="gap-3">
          {rows.map((row) => <EventRow key={row.key} row={row} t={t} />)}
        </View>
      ) : (
        <Text className="text-center text-sm text-ink-secondary">
          {isError ? t('event.matchCentreError') : t('event.noKeyMomentsYet')}
        </Text>
      )}
      <Text className="mt-3 text-[10px] text-ink-tertiary">{t('event.matchCentreSource')}</Text>
    </Card>
  );
}
