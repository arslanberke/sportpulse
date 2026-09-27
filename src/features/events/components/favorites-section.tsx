import { formatDayTime } from '@/lib/dates';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FAVORITE_COLOR } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';
import type { SportEvent } from '@/types';

/**
 * Yildizlanan kuluplerin yaklasan maclari, listenin tepesinde.
 *
 * Bolum acilip kapaniyor ve bu maclar asagidaki takvimden **cikarilmiyor**:
 * bolumu kapali tutan kullanici da maci kendi gununde gormeye devam etsin.
 * Tekrar gorunmeleri bilincli -- burasi bir kisayol, takvimin yerine gecen bir
 * liste degil.
 */
export function FavoritesSection({
  events,
  collapsed,
  onToggleCollapsed,
}: {
  events: SportEvent[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  if (events.length === 0) return null;

  return (
    <View className="mb-6 rounded-2xl border bg-surface p-4" style={{ borderColor: `${FAVORITE_COLOR}40` }}>
      <Pressable
        onPress={onToggleCollapsed}
        className="mb-3 flex-row items-center gap-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
      >
        <Ionicons name="star" size={16} color={FAVORITE_COLOR} />
        <Text className="text-sm font-semibold tracking-wide text-ink">
          {t('home.favorites')}
        </Text>
        <View
          className="rounded-pill px-2 py-0.5"
          style={{ backgroundColor: `${FAVORITE_COLOR}22` }}
        >
          <Text className="text-xs font-bold" style={{ color: FAVORITE_COLOR }}>
            {events.length}
          </Text>
        </View>
        <View className="h-px flex-1 bg-line" />
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={FAVORITE_COLOR}
        />
      </Pressable>

      {!collapsed && <>
        {(showAll ? events : events.slice(0, 2)).map(event => (
          <Link key={event.id} href={`/event/${event.id}`} asChild>
            <Pressable className="min-h-14 flex-row items-center gap-3 border-t border-line py-3 active:opacity-70">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink" numberOfLines={2}>{event.title}</Text>
                <Text className="mt-1 text-[11px] text-ink-secondary">{formatDayTime(event.startsAt)} · {event.leagueName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={FAVORITE_COLOR} />
            </Pressable>
          </Link>
        ))}
        {events.length > 2 && <Pressable onPress={() => setShowAll(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: showAll }} className="min-h-11 items-center justify-center"><Text className="text-xs font-medium" style={{ color: FAVORITE_COLOR }}>{showAll ? t('home.showLess') : t('home.showMoreFavorites', { count: events.length - 2 })}</Text></Pressable>}
      </>}
    </View>
  );
}
