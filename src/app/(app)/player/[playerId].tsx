import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyCard, ErrorCard, LoadingCard } from '@/components/ui/states';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
import { EventCard } from '@/features/events/components/event-card';
import {
    useFavorites,
    useToggleFavoritePlayer,
} from '@/features/follows/hooks/use-favorites';
import { usePlayer, usePlayerEvents } from '@/features/players/hooks/use-players';
import { formatDayTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { useNow } from '@/lib/now';
import { LinearGradient } from 'expo-linear-gradient';

/** Bir sayi ve altinda ne oldugu; siralama ve puan icin. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-surface-raised py-3">
      <Text className="text-xl font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-xs uppercase tracking-wide text-ink-tertiary">{label}</Text>
    </View>
  );
}

/**
 * Sporcu sayfasi: kim oldugu, siralamasi ve yaklasan maclari.
 *
 * Bireysel sporlarda karsilasan taraf bir kulup degil kisi; bu sayfa olmadan
 * "Sinner ne zaman oynuyor" sorusunun cevabi yoktu.
 */
export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { t } = useI18n();
  const colors = useThemeColors();
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

  return (
    <Screen>
      <Stack.Screen options={{ title: player.name }} />
      <View className="pt-4">
        <View className="mb-5 overflow-hidden rounded-3xl border border-line bg-surface p-5">
          <LinearGradient colors={[`${colors.primary}25`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <Text className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">{player.tourName ?? player.sportId}</Text>
          <View className="flex-row items-center gap-3">
            {player.headshotUrl ? (
              <Image
                source={{ uri: player.headshotUrl }}
                style={{ width: 92, height: 112, borderRadius: 20 }}
                contentFit="cover"
                allowDownscaling={false}
              />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-raised">
                <Ionicons name="person" size={32} color={colors.inkTertiary} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-3xl font-semibold tracking-tight text-ink" numberOfLines={3}>
                {player.name}
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                {player.countryFlagUrl && (
                  <Image
                    source={{ uri: player.countryFlagUrl }}
                    style={{ width: 22, height: 15 }}
                    contentFit="contain"
                    allowDownscaling={false}
                  />
                )}
                <Text className="text-sm text-ink-secondary">
                  {[player.countryCode, player.tourName].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>

            {/* Yildiz: bir tenisci lig gibi takip edilmiyor, yildizlaniyor.
                Yildizlaninca maclari ana listeye giriyor ve karti altin
                cerceveyle ciziliyor. */}
            <Pressable
              onPress={() => toggleFavorite.mutate({ playerId, isFavorite: favorite })}
              hitSlop={10}
              className="p-2 active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={t('player.favorite')}
              disabled={toggleFavorite.isPending}
              accessibilityState={{ selected: favorite, disabled: toggleFavorite.isPending }}
            >
              <Ionicons
                name={favorite ? 'star' : 'star-outline'}
                size={26}
                color={favorite ? FAVORITE_COLOR : colors.inkTertiary}
              />
            </Pressable>
          </View>

          {/* Siralama yalnizca listeye girmis oyuncularda var; kuradan gelen
              siralamasiz oyunculara bos kutu gostermenin anlami yok. */}
          {player.rank != null && (
            <View className="mt-4 flex-row gap-2">
              <Stat value={`#${player.rank}`} label={t('player.rank')} />
              {player.rankPoints != null && (
                <Stat value={String(Math.round(player.rankPoints))} label={t('player.points')} />
              )}
            </View>
          )}
          {player.rank != null && <Text className="mt-3 text-xs leading-5 text-ink-secondary">{player.rankSyncedAt ? t('player.rankUpdated', { date: formatDayTime(player.rankSyncedAt) }) : t('player.rankUnknown')}{player.rankSyncedAt && now.getTime() - new Date(player.rankSyncedAt).getTime() > 8 * 86_400_000 ? `\n${t('player.rankStale')}` : ''}</Text>}
          {toggleFavorite.isError && <Text accessibilityRole="alert" className="mt-3 text-sm text-danger">{t('common.couldNotSave')}</Text>}
        </View>

        <Card className="mb-4" index={1}>
          <SectionHeader icon="calendar" label={t('player.matches')} tint={FAVORITE_COLOR} />
          {eventsLoading && <LoadingCard />}
          {eventsError && <ErrorCard message={t('common.somethingWentWrong')} onRetry={() => void refetchEvents()} />}
          {!eventsLoading && !eventsError && (events ?? []).length === 0 && (
            <Text className="text-sm text-ink-secondary">{t('player.noMatches')}</Text>
          )}
        </Card>

        {(events ?? []).map((event, index) => (
          <EventCard key={event.id} event={event} index={index} />
        ))}
      </View>
    </Screen>
  );
}
