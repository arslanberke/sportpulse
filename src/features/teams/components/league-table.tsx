import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { useI18n, type Translate } from '@/lib/i18n';
import { logoThumb } from '@/lib/logo-thumb';
import type { LeagueTable, LeagueTableRow } from '@/types';

/** Which numeric columns a sport's table shows, in display order. */
interface Column {
  key: string;
  label: string;
  value: (row: LeagueTableRow) => string;
}

function columnsFor(sportId: string, t: Translate): Column[] {
  if (sportId === 'basketball') {
    return [
      { key: 'w', label: t('table.w'), value: (r) => String(r.wins) },
      { key: 'l', label: t('table.l'), value: (r) => String(r.losses) },
      { key: 'pct', label: t('table.pct'), value: (r) => r.winPct ?? '-' },
      { key: 'gb', label: t('table.gb'), value: (r) => r.gamesBehind ?? '-' },
    ];
  }
  return [
    { key: 'p', label: t('table.played'), value: (r) => String(r.played) },
    { key: 'w', label: t('table.w'), value: (r) => String(r.wins) },
    { key: 'd', label: t('table.d'), value: (r) => String(r.draws ?? 0) },
    { key: 'l', label: t('table.l'), value: (r) => String(r.losses) },
    { key: 'gd', label: t('table.gd'), value: (r) => r.goalDiff ?? '-' },
    { key: 'pts', label: t('table.pts'), value: (r) => String(r.points ?? 0) },
  ];
}

/**
 * One competition's table. The viewing club's row is tinted so it can be found
 * at a glance in a 36-team league phase.
 */
export function LeagueTableCard({
  table,
  highlightTeam,
}: {
  table: LeagueTable;
  /** Name of the club whose page this is; matched loosely across providers. */
  highlightTeam: string | null;
}) {
  return (
    <View className="mb-5">
      <View className="mb-2 mt-1 flex-row items-center gap-2">
        {table.leagueLogoUrl && (
          <Image
            source={{ uri: logoThumb(table.leagueLogoUrl) }}
            style={{ width: 16, height: 16 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        )}
        <Text className="flex-1 text-xs font-bold text-ink-secondary" numberOfLines={1}>
          {table.leagueName}
        </Text>
        <Text className="text-xs text-ink-tertiary">{table.season}</Text>
      </View>

      <LeagueTableBody table={table} highlightTeams={[highlightTeam]} />
    </View>
  );
}

/** The table rows alone; every club named in `highlightTeams` is tinted. */
export function LeagueTableBody({
  table,
  highlightTeams,
}: {
  table: LeagueTable;
  highlightTeams: (string | null)[];
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const columns = columnsFor(table.sportId, t);
  const needles = highlightTeams.map(fold).filter((n): n is string => n !== null);

  return (
      <View className="gap-4">
        {table.groups.map((group, gi) => (
          <Fragment key={group.name || gi}>
            <View>
              {group.name.length > 0 && table.groups.length > 1 && (
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                  {group.name}
                </Text>
              )}

              <View className="mb-1 flex-row items-center px-1">
                <Text className="w-5 text-[11px] font-medium text-ink-secondary">#</Text>
                <View className="flex-1" />
                {columns.map((column) => (
                  <Text
                    key={column.key}
                    className="w-8 text-center text-[11px] font-medium text-ink-secondary"
                  >
                    {column.label}
                  </Text>
                ))}
              </View>

              <View>
                {group.rows.map((row) => {
                  const folded = fold(row.team);
                  const mine = folded !== null && needles.includes(folded);
                  const teamId = row.teamId ?? null;
                  return (
                    <Pressable
                      key={`${row.team}-${row.rank}`}
                      className="min-h-[34px] flex-row items-center border-b border-line px-1 active:opacity-60"
                      style={mine ? { backgroundColor: `${colors.primary}14` } : undefined}
                      disabled={teamId === null}
                      onPress={() => {
                        if (teamId) router.push(`/team/${teamId}`);
                      }}
                    >
                      <Text className="w-5 text-xs font-semibold text-ink-secondary">
                        {row.rank}
                      </Text>
                      {row.teamLogoUrl ? (
                        <Image
                          source={{ uri: logoThumb(row.teamLogoUrl) }}
                          style={{ width: 18, height: 18, marginRight: 8 }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={{ width: 18, height: 18, marginRight: 8 }} />
                      )}
                      <Text
                        className="flex-1 text-sm text-ink"
                        numberOfLines={1}
                        style={{ fontWeight: mine ? '700' : '400' }}
                      >
                        {row.team}
                      </Text>
                      {columns.map((column, ci) => (
                        <Text
                          key={column.key}
                          className="w-8 text-center text-sm"
                          style={{
                            color: ci === columns.length - 1 ? colors.ink : colors.inkSecondary,
                            fontWeight: ci === columns.length - 1 ? '700' : '400',
                          }}
                        >
                          {column.value(row)}
                        </Text>
                      ))}
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {gi < table.groups.length - 1 && <View className="h-px bg-line" />}
          </Fragment>
        ))}
      </View>
  );
}

/**
 * Loose name key so "Beşiktaş" (our catalog) lines up with "Besiktas" (the
 * table's provider) without a second lookup.
 */
function fold(name: string | null): string | null {
  if (!name) return null;
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(fc|cf|sc|ac|sk|fk|sfk|bb|bk|bc|as|club)\b/g, ' ')
    .replace(/spor\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
