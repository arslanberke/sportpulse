import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useThemeColors } from '@/constants/theme';
import { useLeagues, useSports, useTeams } from '@/features/catalog/hooks/use-catalog';
import { useFollows, useToggleFollow } from '@/features/follows/hooks/use-follows';
import { useI18n } from '@/lib/i18n';
import type { FollowKind, UserFollow } from '@/types';

function followFor(
  follows: UserFollow[],
  kind: FollowKind,
  targetId: string,
): UserFollow | undefined {
  return follows.find(
    (f) =>
      f.kind === kind &&
      (kind === 'sport' ? f.sportId : kind === 'league' ? f.leagueId : f.teamId) === targetId,
  );
}

function FollowChip({
  label,
  icon,
  imageUrl,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  imageUrl?: string | null;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 flex-row items-center gap-1.5 rounded-full px-4 py-2.5 ${
        active ? 'bg-primary' : 'bg-background'
      }`}
    >
      {imageUrl ? (
        <View className="h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 18, height: 18 }}
            contentFit="contain"
          />
        </View>
      ) : (
        icon && (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={active ? '#FFFFFF' : colors.inkSecondary}
          />
        )
      )}
      <Text className={`font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Sport / league / team pickers with follow toggles. Used both in the
 * post-signup setup flow and the Follow tab.
 */
export function FollowPicker() {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const { data: sports } = useSports();
  const { data: leagues } = useLeagues();
  const { data: teams } = useTeams();
  const { data: follows } = useFollows();
  const toggle = useToggleFollow();
  const [teamSearch, setTeamSearch] = useState('');

  const followList = follows ?? [];
  const handleToggle = (kind: FollowKind, targetId: string) => {
    const existing = followFor(followList, kind, targetId);
    toggle.mutate({ kind, targetId, followId: existing?.id });
  };

  const filteredTeams = (teams ?? []).filter((team) =>
    team.name.toLowerCase().includes(teamSearch.trim().toLowerCase()),
  );

  return (
    <View>
      <Card className="mb-4">
        <Text className="mb-3 text-lg font-semibold text-ink">{t('explore.sports')}</Text>
        <View className="flex-row flex-wrap">
          {(sports ?? []).map((sport) => (
            <FollowChip
              key={sport.id}
              label={language === 'tr' ? sport.nameTr : sport.nameEn}
              icon={sport.icon}
              active={Boolean(followFor(followList, 'sport', sport.id))}
              onPress={() => handleToggle('sport', sport.id)}
            />
          ))}
        </View>
      </Card>

      <Card className="mb-4">
        <Text className="mb-3 text-lg font-semibold text-ink">{t('explore.leagues')}</Text>
        <View className="flex-row flex-wrap">
          {(leagues ?? []).map((league) => (
            <FollowChip
              key={league.id}
              label={league.name}
              active={Boolean(followFor(followList, 'league', league.id))}
              onPress={() => handleToggle('league', league.id)}
            />
          ))}
        </View>
      </Card>

      <Card className="mb-4">
        <Text className="mb-3 text-lg font-semibold text-ink">{t('explore.teams')}</Text>
        <TextInput
          className="mb-3 rounded-button bg-background px-4 py-3 text-ink"
          placeholder={t('explore.searchTeams')}
          placeholderTextColor={colors.inkTertiary}
          value={teamSearch}
          onChangeText={setTeamSearch}
        />
        {filteredTeams.length === 0 && (
          <Text className="text-sm text-ink-secondary">{t('explore.noTeams')}</Text>
        )}
        <View className="flex-row flex-wrap">
          {filteredTeams.slice(0, 40).map((team) => (
            <FollowChip
              key={team.id}
              label={team.name}
              imageUrl={team.logoUrl}
              active={Boolean(followFor(followList, 'team', team.id))}
              onPress={() => handleToggle('team', team.id)}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}
