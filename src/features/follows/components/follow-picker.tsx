import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useSportLogos, useSports } from '@/features/catalog/hooks/use-catalog';
import { FollowRow } from '@/features/follows/components/follow-row';
import { useFollowActions } from '@/features/follows/hooks/use-follow-actions';
import { useI18n } from '@/lib/i18n';

/**
 * Top level of the follow hierarchy: one row per sport. The tick box
 * follows the whole sport, the row opens its leagues.
 *
 * Used by both the Follow tab and the post-signup setup flow.
 */
export function FollowPicker() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { data: sports } = useSports();
  const sportLogos = useSportLogos();
  const { isFollowing, toggleFollow } = useFollowActions();

  return (
    <Card className="mb-4">
      <Text className="mb-1 text-lg font-semibold text-ink">{t('explore.sports')}</Text>
      <Text className="mb-2 text-sm text-ink-secondary">{t('explore.sportsHint')}</Text>
      <View>
        {(sports ?? []).map((sport, i) => (
          <FollowRow
            key={sport.id}
            index={i}
            label={language === 'tr' ? sport.nameTr : sport.nameEn}
            icon={sport.icon}
            imageUrl={sportLogos.get(sport.id)}
            following={isFollowing('sport', sport.id)}
            onToggleFollow={() => toggleFollow('sport', sport.id)}
            onPress={() => router.push(`/follow/sport/${sport.id}`)}
          />
        ))}
      </View>
    </Card>
  );
}
