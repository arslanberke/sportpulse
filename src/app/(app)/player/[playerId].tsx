import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionPill, FlatEmpty, IdentityRow, StatStrip } from '@/components/ui/flat';
import { Screen } from '@/components/ui/screen';
import { FlatHeader } from '@/components/ui/section-header';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { TimelineCard } from '@/features/events/components/timeline-card';
import {
    useFavorites,
    useToggleFavoritePlayer,
} from '@/features/follows/hooks/use-favorites';
import { usePlayer, usePlayerEvents } from '@/features/players/hooks/use-players';
import { formatDateShort, formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { useNow } from '@/lib/now';

/**
 * Sporcu sayfasi: kim oldugu, siralamasi ve yaklasan maclari.
 *
 * Bireysel sporlarda karsilasan taraf bir kulup degil kisi; bu sayfa olmadan
 * "Sinner ne zaman oynuyor" sorusunun cevabi yoktu.
 */
export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { t } = useI18n();
  const now = useNow();

  const { data: player, isLoading, isError, refetch } = usePlayer(playerId);
  const { data: events, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = usePlayerEvents(playerId);
  const { favoritePlayerIds } = useFavorites();
  const toggleFavorite = useToggleFavoritePlayer();
  const favorite = favoritePlayerIds.has(playerId);

  if (isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <LoadingCard />
      </Screen>
    );
  }

  if (isError) return <Screen><ErrorCard message={t('common.somethingWentWrong')} onRetry={() => void refetch()} /></Screen>;

  if (!player) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyCard message={t('player.notFound')} />
      </Screen>
    );
  }

  const list = events ?? [];
  return (
    <Screen>
      <Stack.Screen options={{ title: player.name }} />
      <View className="pt-2">
        <IdentityRow
          imageUrl={player.headshotUrl}
          shape="photo"
          placeholder="person"
          title={player.name}
          subtitle={[player.countryCode, player.tourName ?? player.sportId].filter(Boolean).join(' · ')}
          subtitleImageUrl={player.countryFlagUrl}
        />
        {/* Yildiz: bir tenisci lig gibi takip edilmiyor, yildizlaniyor.
            Yildizlaninca maclari ana listeye giriyor. */}
        <View className="mb-1 flex-row">
          <ActionPill
            label={favorite ? t('team.favorite') : t('team.addFavorite')}
            icon={favorite ? 'star' : 'star-outline'}
            tone="favorite"
            active={favorite}
            disabled={toggleFavorite.isPending}
            onPress={() => toggleFavorite.mutate({ playerId, isFavorite: favorite })}
          />
        </View>
        {toggleFavorite.isError && <Text accessibilityRole="alert" className="mt-2 text-sm text-danger">{t('common.couldNotSave')}</Text>}

        {/* Siralama yalnizca listeye girmis oyuncularda var. */}
        {player.rank != null && (
          <>
            <StatStrip
              items={[
                { value: `#${player.rank}`, label: t('player.rank') },
                ...(player.rankPoints != null
                  ? [{ value: String(Math.round(player.rankPoints)), label: t('player.points') }]
                  : []),
              ]}
            />
            <Text className="text-[11px] leading-4 text-ink-tertiary">{player.rankSyncedAt ? t('player.rankUpdated', { date: formatDayTime(player.rankSyncedAt) }) : t('player.rankUnknown')}{player.rankSyncedAt && now.getTime() - new Date(player.rankSyncedAt).getTime() > 8 * 86_400_000 ? ` · ${t('player.rankStale')}` : ''}</Text>
          </>
        )}

        <FlatHeader label={t('player.matches')} note={list.length > 0 ? String(list.length) : null} />
        {eventsLoading && <LoadingCard />}
        {eventsError && <ErrorCard message={t('common.somethingWentWrong')} onRetry={() => void refetchEvents()} />}
        {!eventsLoading && !eventsError && list.length === 0 && <FlatEmpty message={t('player.noMatches')} />}
        {list.map((event, index) => (
          <TimelineCard key={event.id} event={event} first={index === 0} dayLabel={formatDateShort(event.startsAt)} />
        ))}
      </View>
    </Screen>
  );
}
