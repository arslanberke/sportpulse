import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useThemeColors } from '@/constants/theme';
import { useCatalogSearch, useSports } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { FollowRow } from '@/features/follows/components/follow-row';
import { useFollowActions } from '@/features/follows/hooks/use-follow-actions';
import { useI18n } from '@/lib/i18n';

/**
 * One search box over the whole catalog, so following "Galatasaray" doesn't
 * mean walking football → Süper Lig → teams first. Sports are filtered from
 * the already-loaded list; leagues and teams are looked up server-side.
 */
export function FollowSearch() {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const [term, setTerm] = useState('');
  const { data: sports } = useSports();
  const { data: results, isFetching } = useCatalogSearch(term);
  const { isFollowing, toggleFollow } = useFollowActions();

  const trimmed = term.trim();
  const needle = trimmed.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US');

  const sportHits =
    trimmed.length >= 2
      ? (sports ?? []).filter((sport) =>
          [sport.nameTr, sport.nameEn].some((name) =>
            name.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US').includes(needle),
          ),
        )
      : [];
  /**
   * Takim satirlarinda bransin adi. Ayni ad birden fazla bransta gecebiliyor
   * ("Fenerbahce"), armalar da birbirine benziyor.
   */
  const sportName = (sportId: string) => {
    const sport = (sports ?? []).find((s) => s.id === sportId);
    if (!sport) return undefined;
    return language === 'tr' ? sport.nameTr : sport.nameEn;
  };

  const leagueHits = results?.leagues ?? [];
  const teamHits = results?.teams ?? [];
  const empty =
    trimmed.length >= 2 &&
    !isFetching &&
    sportHits.length === 0 &&
    leagueHits.length === 0 &&
    teamHits.length === 0;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center gap-2 rounded-button bg-background px-4">
        <Ionicons name="search" size={18} color={colors.inkTertiary} />
        <TextInput
          className="flex-1 py-3 text-ink"
          placeholder={t('explore.searchAll')}
          placeholderTextColor={colors.inkTertiary}
          value={term}
          onChangeText={setTerm}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {isFetching && <ActivityIndicator size="small" color={colors.inkTertiary} />}
      </View>

      {trimmed.length > 0 && trimmed.length < 2 && (
        <Text className="mt-3 text-sm text-ink-secondary">{t('explore.searchMore')}</Text>
      )}

      {empty && (
        <Text className="mt-3 text-sm text-ink-secondary">{t('explore.noResults')}</Text>
      )}

      {sportHits.length > 0 && (
        <View className="mt-3">
          <Text className="mb-1 text-xs font-semibold uppercase text-ink-tertiary">
            {t('explore.sports')}
          </Text>
          {sportHits.map((sport, i) => (
            <FollowRow
              key={sport.id}
              index={i}
              label={language === 'tr' ? sport.nameTr : sport.nameEn}
              icon={sport.icon}
              following={isFollowing('sport', sport.id)}
              onToggleFollow={() => toggleFollow('sport', sport.id)}
              onPress={() => router.push(`/follow/sport/${sport.id}`)}
            />
          ))}
        </View>
      )}

      {leagueHits.length > 0 && (
        <View className="mt-3">
          <Text className="mb-1 text-xs font-semibold uppercase text-ink-tertiary">
            {t('explore.leagues')}
          </Text>
          {leagueHits.map((league, i) => (
            <FollowRow
              key={league.id}
              index={i}
              label={league.name}
              imageUrl={league.logoUrl}
              following={isFollowing('league', league.id)}
              // The sport above it already covers every league inside.
              coveredByParent={isFollowing('sport', league.sportId)}
              onToggleFollow={() => toggleFollow('league', league.id)}
              onPress={
                hasTeams(league.sportId)
                  ? () => router.push(`/follow/league/${league.id}`)
                  : undefined
              }
            />
          ))}
        </View>
      )}

      {teamHits.length > 0 && (
        <View className="mt-3">
          <Text className="mb-1 text-xs font-semibold uppercase text-ink-tertiary">
            {t('explore.teams')}
          </Text>
          {teamHits.map((team, i) => (
            <FollowRow
              key={team.id}
              index={i}
              label={team.name}
              meta={sportName(team.sportId)}
              imageUrl={team.logoUrl}
              following={isFollowing('team', team.id)}
              coveredByParent={
                isFollowing('sport', team.sportId) ||
                Boolean(team.leagueId && isFollowing('league', team.leagueId))
              }
              onToggleFollow={() => toggleFollow('team', team.id)}
              onPress={() => router.push(`/team/${team.id}`)}
            />
          ))}
        </View>
      )}

      {trimmed.length >= 2 && (leagueHits.length > 0 || teamHits.length > 0) && (
        <Pressable
          onPress={() => setTerm('')}
          hitSlop={8}
          className="mt-3 self-start active:opacity-60"
        >
          <Text className="text-sm font-medium text-primary">{t('explore.clearSearch')}</Text>
        </Pressable>
      )}
    </Card>
  );
}
