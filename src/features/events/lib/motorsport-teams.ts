/**
 * Accent colors for F1 constructors and MotoGP manufacturers, so results and
 * standings rows can carry a team color strip like the official sites do.
 * Matched by case-insensitive substring, since providers spell teams slightly
 * differently (e.g. "Alpine F1 Team" vs "Alpine").
 */
const TEAM_COLORS: { match: string; color: string }[] = [
  // F1 constructors
  { match: 'mclaren', color: '#FF8000' },
  { match: 'red bull', color: '#3671C6' },
  { match: 'ferrari', color: '#E8002D' },
  { match: 'mercedes', color: '#27F4D2' },
  { match: 'williams', color: '#64C4FF' },
  { match: 'aston martin', color: '#229971' },
  { match: 'alpine', color: '#0093CC' },
  { match: 'haas', color: '#B6BABD' },
  { match: 'racing bulls', color: '#6692FF' },
  { match: 'rb ', color: '#6692FF' },
  { match: 'sauber', color: '#52E252' },
  // MotoGP manufacturers
  { match: 'ducati', color: '#C4122E' },
  { match: 'aprilia', color: '#00A0DC' },
  { match: 'ktm', color: '#FF6600' },
  { match: 'honda', color: '#E4002B' },
  { match: 'yamaha', color: '#0033A0' },
];

export function teamAccentColor(team: string | null): string | null {
  if (!team) return null;
  const t = team.toLowerCase();
  return TEAM_COLORS.find((c) => t.includes(c.match))?.color ?? null;
}
