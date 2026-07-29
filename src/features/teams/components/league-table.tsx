import { Image } from 'expo-image';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useThemeColors } from '@/constants/theme';
import { useI18n, type Translate } from '@/lib/i18n';
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
  index,
}: {
  table: LeagueTable;
  /** Name of the club whose page this is; matched loosely across providers. */
  highlightTeam: string | null;
  index?: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const columns = columnsFor(table.sportId, t);
  const needle = fold(highlightTeam);

  return (
    <Card className="mb-4" index={index}>
      <View className="mb-3 flex-row items-center gap-2">
        {table.leagueLogoUrl && (
          <Image
            source={{ uri: table.leagueLogoUrl }}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
          />
        )}
        <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
          {table.leagueName}
        </Text>
        <Text className="text-xs text-ink-secondary">{table.season}</Text>
      </View>

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

              <View className="gap-1">
                {group.rows.map((row) => {
                  const mine = needle !== null && fold(row.team) === needle;
                  return (
                    <View
                      key={`${row.team}-${row.rank}`}
                      className="flex-row items-center rounded-lg px-1 py-1"
                      style={mine ? { backgroundColor: `${colors.primary}1F` } : undefined}
                    >
                      <Text className="w-5 text-xs font-semibold text-ink-secondary">
                        {row.rank}
                      </Text>
                      {row.teamLogoUrl ? (
                        <Image
                          source={{ uri: row.teamLogoUrl }}
                          style={{ width: 20, height: 20, marginRight: 8 }}
                          contentFit="contain"
                        />
                      ) : (
                        <View style={{ width: 20, height: 20, marginRight: 8 }} />
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
                    </View>
                  );
                })}
              </View>
            </View>
            {gi < table.groups.length - 1 && <View className="h-px bg-line" />}
          </Fragment>
        ))}
      </View>
    </Card>
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
