import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FlatEmpty, IdentityRow, InfoLine, PillTabs, StatStrip } from '@/components/ui/flat';
import { Screen } from '@/components/ui/screen';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { useThemeColors } from '@/constants/theme';
import { useBasketballPlayer, useEspnEventLinks } from '@/features/players/hooks/use-basketball-player';
import { formatDate, formatDateShort } from '@/lib/dates';
import { useI18n, type Translate } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import type { BasketballGame, BasketballSeason } from '@/services/providers/espn-athlete';

type Tab = 'games' | 'seasons' | 'info';

const SUMMARY_KEYS = {
  PTS: 'basketballPlayer.pts',
  REB: 'basketballPlayer.reb',
  AST: 'basketballPlayer.ast',
  'FG%': 'basketballPlayer.fg',
} as const;

const POSITIONS = {
  G: 'basketballPlayer.pos.G',
  F: 'basketballPlayer.pos.F',
  C: 'basketballPlayer.pos.C',
  PG: 'basketballPlayer.pos.PG',
  SG: 'basketballPlayer.pos.SG',
  SF: 'basketballPlayer.pos.SF',
  PF: 'basketballPlayer.pos.PF',
} as const;

function positionLabel(position: string | null, t: Translate): string | null {
  if (!position) return null;
  return position
    .split('-')
    .map((p) => (p in POSITIONS ? t(POSITIONS[p as keyof typeof POSITIONS]) : p))
    .join(' / ');
}

function Num({ value, bold = false, wide = false }: { value: string; bold?: boolean; wide?: boolean }) {
  return (
    <Text
      className={`${wide ? 'w-11' : 'w-9'} text-right text-[13px] ${bold ? 'font-bold text-ink' : 'text-ink-secondary'}`}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {value}
    </Text>
  );
}

function HeaderRow({ labels }: { labels: { text: string; wide?: boolean }[] }) {
  return (
    <View className="flex-row items-center gap-2 border-b border-line pb-1.5">
      <View className="flex-1" />
      {labels.map((l) => (
        <Text
          key={l.text}
          className={`${l.wide ? 'w-11' : 'w-9'} text-right text-[10px] font-semibold uppercase text-ink-tertiary`}
          numberOfLines={1}
        >
          {l.text}
        </Text>
      ))}
    </View>
  );
}

function SmallLogo({ uri }: { uri: string | null }) {
  return uri ? (
    <Image source={{ uri: logoThumb(uri) }} style={{ width: 20, height: 20 }} contentFit="contain" cachePolicy="memory-disk" />
  ) : (
    <View className="h-5 w-5" />
  );
}

function GameRow({ game, eventId, last }: { game: BasketballGame; eventId: string | undefined; last: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const colors = useThemeColors();
  const won = game.result === 'W';
  const body = (
    <View className={`min-h-[46px] flex-row items-center gap-2 py-2 ${last ? '' : 'border-b border-line'}`}>
      <Text className="w-11 text-xs text-ink-tertiary">{formatDateShort(game.date)}</Text>
      <SmallLogo uri={game.opponentLogoUrl} />
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>
          {game.home ? '' : '@ '}
          {game.opponent}
        </Text>
        {game.score && (
          <Text className="text-[11px] text-ink-tertiary">
            <Text style={{ color: won ? colors.primaryDark : colors.danger }} className="font-bold">
              {won ? t('basketballPlayer.win') : t('basketballPlayer.loss')}
            </Text>{' '}
            {game.score}
          </Text>
        )}
      </View>
      <Num value={game.minutes} />
      <Num value={game.points} bold />
      <Num value={game.rebounds} />
      <Num value={game.assists} />
      {eventId ? <Ionicons name="chevron-forward" size={14} color={colors.inkTertiary} /> : <View className="w-3.5" />}
    </View>
  );
  if (!eventId) return body;
  return (
    <Pressable onPress={() => router.push(`/event/${eventId}`)} className="active:opacity-60">
      {body}
    </Pressable>
  );
}

function SeasonRow({ season, last }: { season: BasketballSeason; last: boolean }) {
  return (
    <View className={`min-h-[46px] flex-row items-center gap-2 py-2 ${last ? '' : 'border-b border-line'}`}>
      <SmallLogo uri={season.teamLogoUrl} />
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-ink">{season.season}</Text>
        {season.teamName && (
          <Text className="text-[11px] text-ink-tertiary" numberOfLines={1}>{season.teamName}</Text>
        )}
      </View>
      <Num value={season.games} />
      <Num value={season.points} bold />
      <Num value={season.rebounds} />
      <Num value={season.assists} />
    </View>
  );
}

/** Basketball player page: ESPN bio, recent games and season averages. */
export default function BasketballPlayerScreen() {
  const { espnId, league } = useLocalSearchParams<{ espnId: string; league?: string }>();
  const { t } = useI18n();
  const { data: player, isLoading, isError, refetch } = useBasketballPlayer(league ?? 'nba', espnId);
  const { data: links } = useEspnEventLinks(player?.games.map((g) => g.espnEventId) ?? []);
  const [picked, setPicked] = useState<Tab | null>(null);

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
        <EmptyCard message={t('basketballPlayer.notFound')} />
      </Screen>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'games', label: t('basketballPlayer.games') },
    ...(player.seasons.length > 0 ? [{ key: 'seasons' as const, label: t('basketballPlayer.seasons') }] : []),
    { key: 'info', label: t('event.motorsport.info') },
  ];
  const tab = picked && tabs.some((x) => x.key === picked) ? picked : tabs[0].key;
  const statLabels = [
    { text: t('basketballPlayer.pts') },
    { text: t('basketballPlayer.reb') },
    { text: t('basketballPlayer.ast') },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: player.name }} />
      <View className="pt-2">
        <IdentityRow
          imageUrl={player.photoUrl}
          shape="photo"
          placeholder="person"
          title={player.name}
          subtitle={[
            player.jersey ? `#${player.jersey}` : null,
            player.teamName,
            positionLabel(player.position, t),
          ].filter(Boolean).join(' · ')}
          subtitleImageUrl={player.teamLogoUrl ? logoThumb(player.teamLogoUrl) : null}
        />
        <StatStrip
          items={player.summary
            .filter((s) => s.label in SUMMARY_KEYS)
            .map((s) => ({ value: s.value, label: t(SUMMARY_KEYS[s.label as keyof typeof SUMMARY_KEYS]) }))}
        />

        <View className="mt-2">
          <PillTabs tabs={tabs} value={tab} onChange={setPicked} />
        </View>

        {tab === 'games' &&
          (player.games.length === 0 ? (
            <FlatEmpty message={t('basketballPlayer.noGames')} />
          ) : (
            <>
              <View className="flex-row items-center gap-2 border-b border-line pb-1.5">
                <View className="flex-1" />
                {[t('basketballPlayer.min'), ...statLabels.map((l) => l.text)].map((text) => (
                  <Text key={text} className="w-9 text-right text-[10px] font-semibold uppercase text-ink-tertiary" numberOfLines={1}>
                    {text}
                  </Text>
                ))}
                <View className="w-3.5" />
              </View>
              {player.games.map((g, i) => (
                <GameRow key={g.espnEventId} game={g} eventId={links?.[g.espnEventId]} last={i === player.games.length - 1} />
              ))}
            </>
          ))}

        {tab === 'seasons' && (
          <>
            <HeaderRow labels={[{ text: t('basketballPlayer.gp') }, ...statLabels]} />
            {player.seasons.map((s, i) => (
              <SeasonRow key={`${s.season}-${s.teamName ?? i}`} season={s} last={i === player.seasons.length - 1} />
            ))}
          </>
        )}

        {tab === 'info' && (
          <>
            <InfoLine
              label={t('footballPlayer.born')}
              value={player.birthDate ? `${formatDate(player.birthDate)}${player.age != null ? ` (${player.age})` : ''}` : null}
            />
            <InfoLine label={t('basketballPlayer.birthPlace')} value={player.birthPlace} />
            <InfoLine label={t('footballPlayer.height')} value={player.heightCm != null ? `${player.heightCm} cm` : null} />
            <InfoLine label={t('footballPlayer.weight')} value={player.weightKg != null ? `${player.weightKg} kg` : null} />
            <InfoLine label={t('basketballPlayer.draft')} value={player.draft} last />
          </>
        )}
      </View>
    </Screen>
  );
}
