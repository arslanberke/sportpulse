import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useThemeColors } from '@/constants/theme';
import { useCatalogSearch, useSports } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { useI18n } from '@/lib/i18n';
import { searchNeedles } from '@/lib/search';

interface WeekHeaderProps {
  term: string;
  onTermChange: (term: string) => void;
  /** Arama alani acik mi; kapaliyken baslik ve dugmeler gorunur. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

/**
 * Bir onerinin kendi sayfasina giden karesi: rozet + ad + brans simgesi.
 *
 * Brans simgesi sart: ayni kulubun futbol, basketbol ve voleybol takimlari ayni
 * adla listelenir ve simge olmadan hangisi oldugu anlasilmaz.
 */
function SuggestionTile({
  label,
  imageUrl,
  sportIcon,
  onPress,
}: {
  label: string;
  imageUrl: string | null;
  sportIcon?: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mb-2 mr-2 max-w-[48%] flex-row items-center gap-2 rounded-pill border border-line bg-surface py-2 pl-2 pr-3 active:opacity-70"
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 22, height: 22 }}
          contentFit="contain"
          allowDownscaling={false}
        />
      ) : (
        <Ionicons name="pricetag-outline" size={16} color={colors.inkTertiary} />
      )}
      <Text className="shrink text-sm font-medium text-ink" numberOfLines={1}>
        {label}
      </Text>
      {sportIcon && (
        <Ionicons
          name={sportIcon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={colors.inkTertiary}
        />
      )}
    </Pressable>
  );
}

/**
 * Ana ekranin basligi ve bu hafta icinde arama.
 *
 * Arama iki isi birden yapar: yazilan terim ekrandaki etkinlik listesini suzer
 * (bu isi ekran yapar) ve burada terimle eslesen lig/takimlar kare kare
 * listelenir, boylece bir takimin kendi sayfasina da gecilebilir.
 *
 * Alan acikken baslik ve ayarlar dugmesi yerini alana birakir; asagi
 * kaydirilinca ekran alani kapatir ve yalnizca yazilan terim bir dugmede
 * kalir. O dugmeye dokunmak alani ve onerileri yeniden acar.
 */
export function WeekHeader({ term, onTermChange, expanded, onExpandedChange }: WeekHeaderProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  // Katalog aramasi sunucuda duz ilike yaptigi icin "avrupa ligi" ingilizce
  // kayitli adi bulamaz; boyle bir karsilik varsa sorgu onunla yapilir.
  const [, canonical] = searchNeedles(term);
  const { data: results } = useCatalogSearch(canonical ?? term);
  const { data: sports } = useSports();

  const sportIcon = (sportId: string) => (sports ?? []).find((s) => s.id === sportId)?.icon;

  const trimmed = term.trim();
  const leagues = results?.leagues ?? [];
  const teams = results?.teams ?? [];
  const players = results?.players ?? [];
  const footballers = results?.footballers ?? [];
  const hasSuggestions =
    leagues.length > 0 || teams.length > 0 || players.length > 0 || footballers.length > 0;

  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-3">
        {/* Slayt animasyonu ekran yeniden gorunurken tekrar tetiklenip alani
            yandan kaydiriyordu; solma ayni hissi yan etkisiz veriyor. */}
        {expanded ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            className="flex-1 flex-row items-center gap-2 rounded-pill border border-line bg-surface px-4"
          >
            <Ionicons name="search" size={18} color={colors.inkTertiary} />
            <TextInput
              className="flex-1 py-3 text-ink"
              placeholder={t('home.search')}
              placeholderTextColor={colors.inkTertiary}
              value={term}
              onChangeText={onTermChange}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => {
                onTermChange('');
                onExpandedChange(false);
              }}
              hitSlop={10}
              accessibilityLabel={t('home.searchClose')}
              className="active:opacity-60"
            >
              <Ionicons name="close" size={20} color={colors.inkSecondary} />
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View className="flex-1">
              <Text className="text-sm font-semibold uppercase tracking-widest text-primary">
                SportPulse
              </Text>
              <Text className="text-3xl font-bold text-ink">{t('home.title')}</Text>
            </View>

            {trimmed === '' ? (
              <Pressable
                onPress={() => onExpandedChange(true)}
                accessibilityLabel={t('home.searchOpen')}
                className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
              >
                <Ionicons name="search" size={20} color={colors.ink} />
              </Pressable>
            ) : (
              // Kaydirdiktan sonra terim gorunur kalir; dokunus alani geri acar.
              <Pressable
                onPress={() => onExpandedChange(true)}
                className="h-11 max-w-[45%] flex-row items-center gap-2 rounded-pill border border-primary bg-surface px-4 active:opacity-70"
              >
                <Ionicons name="search" size={16} color={colors.primary} />
                <Text className="shrink text-sm font-medium text-ink" numberOfLines={1}>
                  {trimmed}
                </Text>
              </Pressable>
            )}

            <Link href="/settings" asChild>
              <Pressable className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70">
                <Ionicons name="settings-outline" size={20} color={colors.ink} />
              </Pressable>
            </Link>
          </>
        )}
      </View>

      {expanded && hasSuggestions && (
        <View className="mt-3 flex-row flex-wrap">
          {leagues.map((league) => (
            <SuggestionTile
              key={league.id}
              label={league.name}
              imageUrl={league.logoUrl}
              sportIcon={sportIcon(league.sportId)}
              onPress={() =>
                router.push(
                  hasTeams(league.sportId)
                    ? `/follow/league/${league.id}`
                    : `/follow/sport/${league.sportId}`,
                )
              }
            />
          ))}
          {players.map((player) => (
            <SuggestionTile
              key={player.id}
              label={[player.name, player.tourName].filter(Boolean).join(' · ')}
              imageUrl={player.headshotUrl ?? player.countryFlagUrl}
              sportIcon={sportIcon(player.sportId)}
              onPress={() => router.push(`/player/${player.id}`)}
            />
          ))}
          {/* Futbolcular veritabaninda degil, BSD'den canli aranir; kimlikleri
              BSD oyuncu kimligi, profil ekranina gider. */}
          {footballers.map((player) => (
            <SuggestionTile
              key={player.id}
              label={[player.name, player.teamName].filter(Boolean).join(' · ')}
              imageUrl={player.photoUrl}
              sportIcon={sportIcon('football')}
              onPress={() => router.push(`/football-player/${player.id}`)}
            />
          ))}
          {teams.map((team) => (
            <SuggestionTile
              key={team.id}
              label={team.name}
              imageUrl={team.logoUrl}
              sportIcon={sportIcon(team.sportId)}
              onPress={() => router.push(`/team/${team.id}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
