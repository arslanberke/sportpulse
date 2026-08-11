import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyCard, LoadingCard } from '@/components/ui/states';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
import { EventCard } from '@/features/events/components/event-card';
import {
  useFavorites,
  useToggleFavoritePlayer,
} from '@/features/follows/hooks/use-favorites';
import { usePlayer, usePlayerEvents } from '@/features/players/hooks/use-players';
import { useI18n } from '@/lib/i18n';

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

  const { data: player, isLoading } = usePlayer(playerId);
  const { data: events, isLoading: eventsLoading } = usePlayerEvents(playerId);
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
        <Card className="mb-4" index={0}>
          <View className="flex-row items-center gap-4">
            {player.headshotUrl ? (
              <Image
                source={{ uri: player.headshotUrl }}
                style={{ width: 72, height: 72, borderRadius: 36 }}
                contentFit="cover"
                allowDownscaling={false}
              />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-raised">
                <Ionicons name="person" size={32} color={colors.inkTertiary} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold text-ink" numberOfLines={2}>
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
              accessibilityState={{ selected: favorite }}
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
        </Card>

        <Card className="mb-4" index={1}>
          <SectionHeader icon="calendar" label={t('player.matches')} tint={FAVORITE_COLOR} />
          {eventsLoading && <LoadingCard />}
          {!eventsLoading && (events ?? []).length === 0 && (
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
