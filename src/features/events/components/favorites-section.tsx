import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { FAVORITE_COLOR } from '@/constants/theme';
import { EventCard } from '@/features/events/components/event-card';
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
  if (events.length === 0) return null;

  return (
    <View className="mb-6">
      <Pressable
        onPress={onToggleCollapsed}
        className="mb-3 flex-row items-center gap-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
      >
        <Ionicons name="star" size={16} color={FAVORITE_COLOR} />
        <Text className="text-base font-bold uppercase tracking-wider text-ink">
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

      {!collapsed &&
        events.map((event, index) => (
          <EventCard key={`fav-${event.id}`} event={event} index={index} />
        ))}
    </View>
  );
}
