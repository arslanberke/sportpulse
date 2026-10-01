import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useLogoTint } from '@/constants/logo-tint';
import { FAVORITE_COLOR, useThemeColors } from '@/constants/theme';
import { useLeagues, useSportLogos, useSports, useTeam } from '@/features/catalog/hooks/use-catalog';
import { useFollowActions } from '@/features/follows/hooks/use-follow-actions';
import {
  useFavorites,
  useToggleFavoritePlayer,
  useToggleFavoriteTeam,
} from '@/features/follows/hooks/use-favorites';
import { usePlayer } from '@/features/players/hooks/use-players';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/use-profile';
import { showAlert } from '@/lib/alert';
import { useI18n, type Translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import type { League, Sport } from '@/types';

function makeProfileSchema(t: Translate) {
  return z.object({ fullName: z.string().trim().min(2, t('profile.nameMin')) });
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>;

type Filter = 'all' | 'fav' | 'teams' | 'leagues' | 'sports';
type SectionKey = 'teams' | 'players' | 'leagues' | 'sports';

/** Takipten cikarilan satir; "Geri al" ayni durumu geri kurar. */
interface Removed {
  kind: SectionKey;
  id: string;
  wasFollowed: boolean;
  wasFavorite: boolean;
}

const ACCENT_WIDTH = 2;
const DIVIDER_INSET = 6;
const UNDO_MS = 5000;

interface ItemRowProps {
  label: string;
  sub?: string | null;
  imageUrl?: string | null;
  icon?: string;
  href: Href;
  first: boolean;
  editing: boolean;
  onRemove: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

/** 22f satiri: kutusuz, ince ayracli; yildizli satirda solda altin serit. */
function ItemRow({
  label,
  sub,
  imageUrl,
  icon,
  href,
  first,
  editing,
  onRemove,
  favorite = false,
  onToggleFavorite,
}: ItemRowProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const logoTint = useLogoTint(imageUrl);
  return (
    <View
      className="flex-row items-center"
      style={{ paddingVertical: 8, paddingLeft: favorite ? ACCENT_WIDTH + 8 : 4, gap: 10 }}
    >
      {!first && (
        <View pointerEvents="none" className="absolute right-0 top-0 h-px bg-line" style={{ left: DIVIDER_INSET }} />
      )}
      {favorite && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 5, bottom: 4, width: ACCENT_WIDTH, borderRadius: 1, backgroundColor: FAVORITE_COLOR }}
        />
      )}
      {editing && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel={t('profile.unfollow')}
        >
          <Ionicons name="remove-circle" size={20} color={colors.live} />
        </Pressable>
      )}
      <Link href={href} asChild>
        <Pressable className="flex-1 flex-row items-center active:opacity-60" style={{ gap: 9 }}>
          <View className="items-center justify-center" style={{ width: 26, height: 26 }}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={{ width: 24, height: 24 }} contentFit="contain" allowDownscaling={false} tintColor={logoTint} />
            ) : (
              <Ionicons name={(icon ?? 'shield-outline') as keyof typeof Ionicons.glyphMap} size={18} color={colors.inkSecondary} />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>{label}</Text>
            {sub ? (
              <Text className="text-[11px] font-medium text-ink-tertiary" numberOfLines={1}>{sub}</Text>
            ) : null}
          </View>
        </Pressable>
      </Link>
      {onToggleFavorite && !editing && (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          className="px-1 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel={t('profile.favorite')}
          accessibilityState={{ selected: favorite }}
        >
          <Ionicons name={favorite ? 'star' : 'star-outline'} size={19} color={favorite ? FAVORITE_COLOR : colors.inkTertiary} />
        </Pressable>
      )}
    </View>
  );
}

interface EntityRowProps {
  id: string;
  first: boolean;
  editing: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onRemove: () => void;
}

function TeamRow({ leagues, sportName, ...props }: EntityRowProps & { leagues: Map<string, League>; sportName: (id: string) => string }) {
  const { data: team } = useTeam(props.id);
  if (!team) return null;
  const league = team.leagueId ? leagues.get(team.leagueId)?.name : null;
  return (
    <ItemRow
      {...props}
      label={team.name}
      sub={[league, sportName(team.sportId)].filter(Boolean).join(' · ')}
      imageUrl={team.logoUrl}
      href={`/team/${team.id}`}
    />
  );
}

function PlayerRow({ sportName, ...props }: EntityRowProps & { sportName: (id: string) => string }) {
  const { data: player } = usePlayer(props.id);
  if (!player) return null;
  const rank = player.rank ? `#${player.rank}` : null;
  return (
    <ItemRow
      {...props}
      label={player.name}
      sub={[player.tourName, sportName(player.sportId), rank].filter(Boolean).join(' · ')}
      imageUrl={player.headshotUrl ?? player.countryFlagUrl}
      icon="person-outline"
      href={`/player/${player.id}`}
    />
  );
}

function SectionHeader({ title, count, editing, onToggleEdit }: { title: string; count: number; editing: boolean; onToggleEdit: () => void }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  return (
    <View className="mb-1 mt-5 flex-row items-center justify-between">
      <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
        {title} · {count}
      </Text>
      {count > 0 && (
        <Pressable onPress={onToggleEdit} hitSlop={8} className="active:opacity-60">
          <Text className="text-[12px] font-semibold" style={{ color: colors.primaryDark }}>
            {editing ? t('profile.done') : t('profile.editList')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, active, onPress, star = false }: { label: string; active: boolean; onPress: () => void; star?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full border px-3 py-1.5 active:opacity-70 ${active ? 'border-ink bg-ink' : 'border-line'}`}
      style={{ gap: 4 }}
    >
      {star && <Ionicons name="star" size={12} color={FAVORITE_COLOR} />}
      <Text className={`text-[12px] font-semibold ${active ? 'text-background' : 'text-ink-secondary'}`} style={!active && star ? { color: colors.ink } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ value, label, favorite = false }: { value: number; label: string; favorite?: boolean }) {
  return (
    <View className="flex-1">
      <Text className="text-[18px] font-extrabold text-ink" style={favorite ? { color: FAVORITE_COLOR } : undefined}>
        {favorite ? `★ ${value}` : value}
      </Text>
      <Text className="text-[11px] font-medium text-ink-tertiary">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const { data: profile } = useProfile();
  const email = useAuthStore((s) => s.session?.user.email);
  const updateProfile = useUpdateProfile();
  const profileSchema = useMemo(() => makeProfileSchema(t), [t]);

  const { followList, toggleFollow } = useFollowActions();
  const { favoriteTeamIds, favoritePlayerIds } = useFavorites();
  const toggleFavoriteTeam = useToggleFavoriteTeam();
  const toggleFavoritePlayer = useToggleFavoritePlayer();
  const { data: sports } = useSports();
  const { data: leagues } = useLeagues();
  const sportLogos = useSportLogos();

  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [removed, setRemoved] = useState<Removed | null>(null);
  // Yildizi kaldirilan satir hemen kaybolmasin; ekranda kalir, geri yildizlanabilir.
  const [kept, setKept] = useState<{ teams: string[]; players: string[] }>({ teams: [], players: [] });
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const sportById = useMemo(() => new Map((sports ?? []).map((s) => [s.id, s])), [sports]);
  const leagueById = useMemo(() => new Map((leagues ?? []).map((l) => [l.id, l])), [leagues]);
  const sportLabel = (sport: Sport | undefined) => (sport ? (language === 'tr' ? sport.nameTr : sport.nameEn) : '');
  const sportName = (id: string) => sportLabel(sportById.get(id));

  const followedTeamIds = useMemo(
    () => followList.filter((f) => f.kind === 'team' && f.teamId).map((f) => f.teamId!),
    [followList],
  );
  const teamIds = useMemo(
    () => [...new Set([...followedTeamIds, ...favoriteTeamIds, ...kept.teams])],
    [followedTeamIds, favoriteTeamIds, kept.teams],
  );
  const playerIds = useMemo(
    () => [...new Set([...favoritePlayerIds, ...kept.players])],
    [favoritePlayerIds, kept.players],
  );
  const followedLeagues = useMemo(
    () => followList.filter((f) => f.kind === 'league' && f.leagueId).map((f) => leagueById.get(f.leagueId!)).filter((l): l is League => Boolean(l)),
    [followList, leagueById],
  );
  const followedSports = useMemo(
    () => followList.filter((f) => f.kind === 'sport' && f.sportId).map((f) => sportById.get(f.sportId!)).filter((s): s is Sport => Boolean(s)),
    [followList, sportById],
  );

  const favoriteCount = favoriteTeamIds.size + favoritePlayerIds.size;
  const favTeams = teamIds.filter((id) => favoriteTeamIds.has(id));
  const favPlayers = playerIds.filter((id) => favoritePlayerIds.has(id));
  const shownTeams = filter === 'fav' ? favTeams : teamIds;
  const shownPlayers = filter === 'fav' ? favPlayers : playerIds;
  const show = (key: SectionKey) =>
    filter === 'all' ||
    (filter === 'fav' && (key === 'teams' || key === 'players')) ||
    (filter === 'teams' && (key === 'teams' || key === 'players')) ||
    filter === key;

  const keep = (kind: 'teams' | 'players', id: string) =>
    setKept((prev) => (prev[kind].includes(id) ? prev : { ...prev, [kind]: [...prev[kind], id] }));

  const starTeam = (id: string) => {
    keep('teams', id);
    toggleFavoriteTeam.mutate({ teamId: id, isFavorite: favoriteTeamIds.has(id) });
  };
  const starPlayer = (id: string) => {
    keep('players', id);
    toggleFavoritePlayer.mutate({ playerId: id, isFavorite: favoritePlayerIds.has(id) });
  };

  const showUndo = (entry: Removed) => {
    setRemoved(entry);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_MS);
  };

  const remove = (kind: SectionKey, id: string) => {
    const unkeep = (k: 'teams' | 'players') => setKept((prev) => ({ ...prev, [k]: prev[k].filter((x) => x !== id) }));
    if (kind === 'teams') {
      const wasFollowed = followedTeamIds.includes(id);
      const wasFavorite = favoriteTeamIds.has(id);
      unkeep('teams');
      if (wasFollowed) toggleFollow('team', id);
      if (wasFavorite) toggleFavoriteTeam.mutate({ teamId: id, isFavorite: true });
      showUndo({ kind, id, wasFollowed, wasFavorite });
    } else if (kind === 'players') {
      const wasFavorite = favoritePlayerIds.has(id);
      unkeep('players');
      if (wasFavorite) toggleFavoritePlayer.mutate({ playerId: id, isFavorite: true });
      showUndo({ kind, id, wasFollowed: false, wasFavorite });
    } else {
      toggleFollow(kind === 'leagues' ? 'league' : 'sport', id);
      showUndo({ kind, id, wasFollowed: true, wasFavorite: false });
    }
  };

  const undo = () => {
    if (!removed) return;
    const { kind, id, wasFollowed, wasFavorite } = removed;
    if (kind === 'teams') {
      if (wasFollowed) toggleFollow('team', id);
      if (wasFavorite) toggleFavoriteTeam.mutate({ teamId: id, isFavorite: false });
    } else if (kind === 'players') {
      if (wasFavorite) toggleFavoritePlayer.mutate({ playerId: id, isFavorite: false });
    } else {
      toggleFollow(kind === 'leagues' ? 'league' : 'sport', id);
    }
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemoved(null);
  };

  const toggleEdit = (key: SectionKey) => setEditing((prev) => (prev === key ? null : key));

  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '' },
  });

  useEffect(() => {
    if (profile) reset({ fullName: profile.fullName });
  }, [profile, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    if (!profile) return;
    updateProfile.mutate(
      { userId: profile.id, fullName: values.fullName },
      {
        onSuccess: () => {
          setEditingName(false);
          showAlert(t('profile.saved'), t('profile.savedBody'));
        },
        onError: (error) =>
          showAlert(t('common.couldNotSave'), error instanceof Error ? error.message : t('common.tryAgain')),
      },
    );
  };

  const nothingFollowed = teamIds.length + playerIds.length + followedLeagues.length + followedSports.length === 0;

  return (
    <View className="flex-1">
      <Screen>
        <View className="pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-extrabold text-ink">{t('profile.title')}</Text>
            <Link href="/settings" asChild>
              <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.settings')} className="active:opacity-60">
                <Ionicons name="settings-outline" size={22} color={colors.ink} />
              </Pressable>
            </Link>
          </View>

          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Avatar name={profile?.fullName ?? '?'} imageUrl={profile?.avatarUrl} size="md" />
            <View className="flex-1">
              <Text className="text-[16px] font-bold text-ink" numberOfLines={1}>{profile?.fullName || '...'}</Text>
              {email && <Text className="text-[12px] text-ink-tertiary" numberOfLines={1}>{email}</Text>}
            </View>
            <Pressable
              onPress={() => setEditingName((v) => !v)}
              hitSlop={10}
              className="active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={t('profile.edit')}
            >
              <Ionicons name={editingName ? 'close' : 'create-outline'} size={20} color={colors.inkSecondary} />
            </Pressable>
          </View>

          {editingName && (
            <View className="mt-3">
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value }, fieldState }) => (
                  <TextField label={t('profile.yourName')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
                )}
              />
              <Button title={t('profile.save')} onPress={handleSubmit(onSubmit)} loading={updateProfile.isPending} />
            </View>
          )}

          <View className="mt-4 flex-row border-b border-t border-line py-3">
            <Stat value={teamIds.length + playerIds.length} label={t('profile.teamsAndPlayers')} />
            <Stat value={followedLeagues.length} label={t('explore.leagues')} />
            <Stat value={followedSports.length} label={t('explore.sports')} />
            <Stat value={favoriteCount} label={t('profile.favorites')} favorite />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ gap: 6 }}>
            <Chip label={t('profile.all')} active={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={String(favoriteCount)} star active={filter === 'fav'} onPress={() => setFilter('fav')} />
            <Chip label={t('explore.teams')} active={filter === 'teams'} onPress={() => setFilter('teams')} />
            <Chip label={t('explore.leagues')} active={filter === 'leagues'} onPress={() => setFilter('leagues')} />
            <Chip label={t('explore.sports')} active={filter === 'sports'} onPress={() => setFilter('sports')} />
          </ScrollView>

          {nothingFollowed ? (
            <View className="mt-10 items-center" style={{ gap: 10 }}>
              <Text className="text-[13px] text-ink-secondary">{t('profile.emptyAll')}</Text>
              <Link href="/explore" className="text-[13px] font-semibold" style={{ color: colors.primaryDark }}>{t('profile.addFollows')}</Link>
            </View>
          ) : (
            <>
              {show('teams') && (
                <>
                  <SectionHeader title={t('explore.teams')} count={shownTeams.length} editing={editing === 'teams'} onToggleEdit={() => toggleEdit('teams')} />
                  {shownTeams.length === 0 && <Text className="py-2 text-[12px] text-ink-tertiary">{t('profile.empty')}</Text>}
                  {shownTeams.map((id, i) => (
                    <TeamRow
                      key={id}
                      id={id}
                      first={i === 0}
                      editing={editing === 'teams'}
                      favorite={favoriteTeamIds.has(id)}
                      onToggleFavorite={() => starTeam(id)}
                      onRemove={() => remove('teams', id)}
                      leagues={leagueById}
                      sportName={sportName}
                    />
                  ))}
                </>
              )}
              {show('players') && shownPlayers.length > 0 && (
                <>
                  <SectionHeader title={t('profile.players')} count={shownPlayers.length} editing={editing === 'players'} onToggleEdit={() => toggleEdit('players')} />
                  {shownPlayers.map((id, i) => (
                    <PlayerRow
                      key={id}
                      id={id}
                      first={i === 0}
                      editing={editing === 'players'}
                      favorite={favoritePlayerIds.has(id)}
                      onToggleFavorite={() => starPlayer(id)}
                      onRemove={() => remove('players', id)}
                      sportName={sportName}
                    />
                  ))}
                </>
              )}
              {show('leagues') && (
                <>
                  <SectionHeader title={t('explore.leagues')} count={followedLeagues.length} editing={editing === 'leagues'} onToggleEdit={() => toggleEdit('leagues')} />
                  {followedLeagues.length === 0 && <Text className="py-2 text-[12px] text-ink-tertiary">{t('profile.empty')}</Text>}
                  {followedLeagues.map((league, i) => (
                    <ItemRow
                      key={league.id}
                      label={league.name}
                      sub={[sportName(league.sportId), t('profile.allTeams')].filter(Boolean).join(' · ')}
                      imageUrl={league.logoUrl}
                      icon="trophy-outline"
                      href={`/follow/league/${league.id}`}
                      first={i === 0}
                      editing={editing === 'leagues'}
                      onRemove={() => remove('leagues', league.id)}
                    />
                  ))}
                </>
              )}
              {show('sports') && (
                <>
                  <SectionHeader title={t('explore.sports')} count={followedSports.length} editing={editing === 'sports'} onToggleEdit={() => toggleEdit('sports')} />
                  {followedSports.length === 0 && <Text className="py-2 text-[12px] text-ink-tertiary">{t('profile.empty')}</Text>}
                  {followedSports.map((sport, i) => (
                    <ItemRow
                      key={sport.id}
                      label={sportLabel(sport)}
                      sub={t('profile.allLeagues')}
                      icon={sport.icon}
                      imageUrl={sportLogos.get(sport.id)}
                      href={`/follow/sport/${sport.id}`}
                      first={i === 0}
                      editing={editing === 'sports'}
                      onRemove={() => remove('sports', sport.id)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </Screen>

      {removed && (
        <View className="absolute bottom-4 left-6 right-6 flex-row items-center justify-between rounded-xl bg-ink px-4 py-3">
          <Text className="text-[13px] font-medium text-background">{t('profile.removed')}</Text>
          <Pressable onPress={undo} hitSlop={10} className="active:opacity-60">
            <Text className="text-[13px] font-bold text-primary">{t('profile.undo')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
