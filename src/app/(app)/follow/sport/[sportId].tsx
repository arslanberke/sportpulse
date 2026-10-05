import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { FlatEmpty } from '@/components/ui/flat';
import { Screen } from '@/components/ui/screen';
import { FlatHeader } from '@/components/ui/section-header';
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
      <View className="pt-2">
        <View className="border-b border-line pb-2">
          <FollowRow
            label={t('explore.followWholeSport', { sport: sportName })}
            icon={sport?.icon}
            imageUrl={sportLogos.get(sportId)}
            following={sportFollowed}
            onToggleFollow={() => toggleAll(group)}
          />
          <Text className="text-xs text-ink-secondary">
            {sportFollowed ? t('explore.allLeaguesIncluded') : t('explore.pickLeaguesHint')}
          </Text>
        </View>

        {/* Arama her gruba birlikte uygulandigi icin kartlarin ustunde durur. */}
        {sportLeagues.length > 6 && (
          <TextInput
            className="mt-3 rounded-pill border border-line bg-surface px-4 py-2.5 text-[13px] text-ink"
            placeholder={t('explore.searchLeagues')}
            placeholderTextColor={colors.inkTertiary}
            value={search}
            onChangeText={setSearch}
          />
        )}

        {groups.length === 0 ? (
          <FlatEmpty message={t('explore.noLeagues')} />
        ) : (
          groups.map((section) => (
            <View key={section.kind}>
              <FlatHeader
                label={grouped ? t(KIND_LABEL[section.kind]) : t('explore.leagues')}
                note={String(section.leagues.length)}
              />
              {section.leagues.map((league, i) => (
                <View key={league.id} className="border-b border-line">
                <FollowRow
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
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
