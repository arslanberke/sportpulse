import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { useCatalogSearch, useSports } from '@/features/catalog/hooks/use-catalog';
import { hasTeams } from '@/features/catalog/lib/team-sports';
import { useI18n } from '@/lib/i18n';
import { searchNeedles } from '@/lib/search';

interface WeekHeaderProps {
  /** Buyuk baslik ("Bugun", "Bu hafta", gun adi). */
  title: string;
  /** Basligin ustundeki kucuk tarih satiri. */
  subtitle: string;
  term: string;
  onTermChange: (term: string) => void;
  /** Arama alani acik mi; kapaliyken baslik ve dugmeler gorunur. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Tum haftayi gun gun listeleyen gorunum acik mi. */
  weekActive: boolean;
  onToggleWeek: () => void;
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
 * Alan acikken baslik ve ayarlar dugmesi yerini alana birakir. Klavyedeki
 * "Ara" alani kapatir, terim bir dugmede kalir ve liste suzulmus kalir; o
 * dugmeye dokunmak alani ve onerileri yeniden acar. Carpi terimi siler.
 */
export function WeekHeader({
  title,
  subtitle,
  term,
  onTermChange,
  expanded,
  onExpandedChange,
  weekActive,
  onToggleWeek,
}: WeekHeaderProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  // Katalog aramasi sunucuda duz ilike yaptigi icin "avrupa ligi" ingilizce
  // kayitli adi bulamaz; boyle bir karsilik varsa sorgu onunla yapilir.
  const [, canonical] = searchNeedles(term);
  const { data: results } = useCatalogSearch(canonical ?? term);
  const { data: sports } = useSports();
  const inputRef = useRef<TextInput>(null);

  // Alan acilinca klavye de acilir; odak alan yerlestikten bir kare sonra verilir.
  useEffect(() => {
    if (!expanded) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  const sportIcon = (sportId: string) => (sports ?? []).find((s) => s.id === sportId)?.icon;

  const trimmed = term.trim();
  const leagues = results?.leagues ?? [];
  const teams = results?.teams ?? [];
  const players = results?.players ?? [];
  const footballers = results?.footballers ?? [];
  const hasSuggestions =
    leagues.length > 0 || teams.length > 0 || players.length > 0 || footballers.length > 0;

  return (
    <View className="mb-3">
      <View className="flex-row items-end gap-2">
        {expanded ? (
          <View className="h-10 flex-1 flex-row items-center gap-2 rounded-pill border border-line bg-surface px-4">
            <Ionicons name="search" size={18} color={colors.inkTertiary} />
            <TextInput
              ref={inputRef}
              className="flex-1 text-ink"
              style={{ paddingVertical: 0 }}
              placeholder={t('home.search')}
              placeholderTextColor={colors.inkTertiary}
              value={term}
              onChangeText={onTermChange}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => onExpandedChange(false)}
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
          </View>
        ) : (
          <>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-ink-secondary" numberOfLines={1}>
                {subtitle}
              </Text>
              <Text className="mt-0.5 text-[28px] font-extrabold tracking-tight text-ink" numberOfLines={1}>
                {title}
              </Text>
            </View>

            <Pressable
              onPress={onToggleWeek}
              accessibilityRole="button"
              accessibilityState={{ selected: weekActive }}
              className={`h-10 flex-row items-center gap-1.5 rounded-pill pl-3 pr-3.5 active:opacity-70 ${
                weekActive ? 'bg-primary-light' : 'border border-line bg-surface'
              }`}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
              <Text className={`text-xs font-bold ${weekActive ? 'text-primary' : 'text-ink-secondary'}`}>
                {t('home.weekButton')}
              </Text>
            </Pressable>

            {trimmed === '' ? (
              <Pressable
                onPress={() => onExpandedChange(true)}
                accessibilityLabel={t('home.searchOpen')}
                className="h-10 w-10 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
              >
                <Ionicons name="search" size={18} color={colors.ink} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => onExpandedChange(true)}
                className="h-10 max-w-[35%] flex-row items-center gap-2 rounded-pill border border-primary bg-surface px-3 active:opacity-70"
              >
                <Ionicons name="search" size={16} color={colors.primaryDark} />
                <Text className="shrink text-sm font-medium text-ink" numberOfLines={1}>
                  {trimmed}
                </Text>
              </Pressable>
            )}

            <Link href="/settings" asChild>
              <Pressable
                accessibilityLabel={t('common.settings')}
                className="h-10 w-10 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
              >
                <Ionicons name="settings-outline" size={18} color={colors.ink} />
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
