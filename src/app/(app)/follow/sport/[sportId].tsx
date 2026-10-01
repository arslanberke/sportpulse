import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useSportLogos, useSports } from '@/features/catalog/hooks/use-catalog';
import { groupByKind, type LeagueKind } from '@/features/catalog/lib/league-kind';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { FollowRow } from '@/features/follows/components/follow-row';
import {
    useFollowActions,
    type FollowGroup,
} from '@/features/follows/hooks/use-follow-actions';
import { useI18n } from '@/lib/i18n';
import { matchesAny, searchNeedles } from '@/lib/search';

/** Ceviri anahtarlari tipli oldugu icin sablon yerine acik eslesme. */
const KIND_LABEL = {
  league: 'explore.kind.league',
  continentalCup: 'explore.kind.continentalCup',
  domesticCup: 'explore.kind.domesticCup',
  nationalTeam: 'explore.kind.nationalTeam',
} as const satisfies Record<LeagueKind, string>;

/** Leagues inside one sport, plus a toggle for the sport as a whole. */
export default function SportFollowScreen() {
  const { sportId } = useLocalSearchParams<{ sportId: string }>();
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const { data: sports } = useSports();
  const { data: leagues } = useLeagues();
  const sportLogos = useSportLogos();
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

  // Ana aramayla ayni eslestirme: aksan koreltilir, Turkce yarisma adlari
  // ("uluslar ligi") katalogdaki Ingilizce karsiliga cozulur.
  const visibleLeagues = useMemo(() => {
    const needles = searchNeedles(search);
    if (needles.length === 0) return sportLeagues;
    return sportLeagues.filter((league) => matchesAny([league.name], needles));
  }, [sportLeagues, search]);

  // Kupalar ve ligler ayri listelenir. Tek grup kalirsa (cogu brans boyle)
  // baslik yarismanin turunu degil, genel "Ligler" basligini gosterir.
  const groups = useMemo(() => groupByKind(visibleLeagues), [visibleLeagues]);
  const grouped = groups.length > 1;

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
            imageUrl={sportLogos.get(sportId)}
            following={sportFollowed}
            onToggleFollow={() => toggleAll(group)}
          />
          <Text className="mt-1 text-sm text-ink-secondary">
            {sportFollowed ? t('explore.allLeaguesIncluded') : t('explore.pickLeaguesHint')}
          </Text>
        </Card>

        {/* Arama her gruba birlikte uygulandigi icin kartlarin ustunde durur. */}
        {sportLeagues.length > 6 && (
          <TextInput
            className="mb-4 rounded-button bg-surface px-4 py-3 text-ink"
            placeholder={t('explore.searchLeagues')}
            placeholderTextColor={colors.inkTertiary}
            value={search}
            onChangeText={setSearch}
          />
        )}

        {groups.length === 0 ? (
          <Card className="mb-4" index={1}>
            <Text className="py-2 text-sm text-ink-secondary">{t('explore.noLeagues')}</Text>
          </Card>
        ) : (
          groups.map((section, sectionIndex) => (
            <Card key={section.kind} className="mb-4" index={sectionIndex + 1}>
              <Text className="mb-2 text-lg font-semibold text-ink">
                {grouped ? t(KIND_LABEL[section.kind]) : t('explore.leagues')}
              </Text>
              {section.leagues.map((league, i) => (
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
              ))}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
