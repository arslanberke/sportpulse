import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useSports } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { FollowRow } from '@/features/follows/components/follow-row';
import {
    useFollowActions,
    type FollowGroup,
} from '@/features/follows/hooks/use-follow-actions';
import { useI18n } from '@/lib/i18n';

/** Leagues inside one sport, plus a toggle for the sport as a whole. */
export default function SportFollowScreen() {
  const { sportId } = useLocalSearchParams<{ sportId: string }>();
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const { data: sports } = useSports();
  const { data: leagues } = useLeagues();
  const { isFollowing, toggleAll, toggleWithin } = useFollowActions();
  const [search, setSearch] = useState('');

  const sport = (sports ?? []).find((s) => s.id === sportId);
  // Only club sports have a team level worth drilling into.
  const teamLevel = hasTeams(sportId);
  const sportName = sport ? (language === 'tr' ? sport.nameTr : sport.nameEn) : '';
  const sportFollowed = isFollowing('sport', sportId);

  const sportLeagues = useMemo(
    () => (leagues ?? []).filter((league) => league.sportId === sportId),
    [leagues, sportId],
  );

  const visibleLeagues = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sportLeagues;
    return sportLeagues.filter((league) => league.name.toLowerCase().includes(term));
  }, [sportLeagues, search]);

  const group: FollowGroup = useMemo(
    () => ({
      parentKind: 'sport',
      parentId: sportId,
      childKind: 'league',
      childIds: sportLeagues.map((league) => league.id),
    }),
    [sportId, sportLeagues],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: sportName }} />
      <View className="pt-4">
        <Card className="mb-4" index={0}>
          <FollowRow
            label={t('explore.followWholeSport', { sport: sportName })}
            icon={sport?.icon}
            following={sportFollowed}
            onToggleFollow={() => toggleAll(group)}
          />
          <Text className="mt-1 text-sm text-ink-secondary">
            {sportFollowed ? t('explore.allLeaguesIncluded') : t('explore.pickLeaguesHint')}
          </Text>
        </Card>

        <Card className="mb-4" index={1}>
          <Text className="mb-2 text-lg font-semibold text-ink">{t('explore.leagues')}</Text>
          {sportLeagues.length > 6 && (
            <TextInput
              className="mb-2 rounded-button bg-background px-4 py-3 text-ink"
              placeholder={t('explore.searchLeagues')}
              placeholderTextColor={colors.inkTertiary}
              value={search}
              onChangeText={setSearch}
            />
          )}
          {visibleLeagues.length === 0 ? (
            <Text className="py-2 text-sm text-ink-secondary">{t('explore.noLeagues')}</Text>
          ) : (
            visibleLeagues.map((league, i) => (
              <FollowRow
                key={league.id}
                index={i}
                label={league.name}
                imageUrl={league.logoUrl}
                following={sportFollowed || isFollowing('league', league.id)}
                onToggleFollow={() => toggleWithin(group, league.id)}
                onPress={
                  teamLevel
                    ? () => router.push(`/follow/league/${league.id}`)
                    : undefined
                }
              />
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}
