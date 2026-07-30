/**
 * Official media URLs for F1 drivers and constructors, derived from names so
 * they work without extra API calls. MotoGP rider photos come straight from
 * the pulselive rider list (see standings/results providers). All best-effort:
 * the UI falls back to initials + team color when an image 404s.
 */

function ascii(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/** F1 constructor -> formula1.com team-logo slug (substring match). */
const F1_TEAM_SLUG: { match: string; slug: string }[] = [
  { match: 'mclaren', slug: 'mclaren' },
  { match: 'red bull', slug: 'red-bull-racing' },
  { match: 'ferrari', slug: 'ferrari' },
  { match: 'mercedes', slug: 'mercedes' },
  { match: 'williams', slug: 'williams' },
  { match: 'aston martin', slug: 'aston-martin' },
  { match: 'alpine', slug: 'alpine' },
  { match: 'haas', slug: 'haas' },
  { match: 'sauber', slug: 'kick-sauber' },
  { match: 'racing bulls', slug: 'racing-bulls' },
  { match: 'rb ', slug: 'racing-bulls' },
];

export function f1TeamLogo(team: string | null): string | null {
  if (!team) return null;
  const t = team.toLowerCase();
  const slug = F1_TEAM_SLUG.find((s) => t.includes(s.match))?.slug;
  return slug
    ? `https://media.formula1.com/content/dam/fom-website/teams/2025/${slug}-logo.png`
    : null;
}

/**
 * Saglayicinin kullandigi ad, formula1.com'un dosya semasindaki addan
 * ayrilabiliyor: ESPN "Kimi Antonelli" derken fotograf "Andrea Kimi Antonelli"
 * adiyla saklaniyor ve turetilen adres 404 donuyor. Ergast ayni surucuye tam
 * adiyla dediginden sampiyona tablosunda fotograf cikiyor, seans sonuclarinda
 * cikmiyordu.
 *
 * Burada yalnizca fotografi gercekten var olan surucler tutulur. Yedek ve test
 * pilotlarinin (Aron, Lindblad, Herta, Iwasa, ...) F1 sitesinde fotografi hic
 * yok; onlarda bas harflere dusmek dogru davranis.
 */
const F1_DRIVER_ALIASES: Record<string, string> = {
  'kimi antonelli': 'Andrea Kimi Antonelli',
};

/**
 * formula1.com driver headshot from a full name, e.g. "Lando Norris" ->
 * .../drivers/L/LANNOR01_Lando_Norris/lannor01.png. Uses the first given name
 * for the 3-letter prefix, matching F1's own scheme.
 */
export function f1DriverPhoto(fullName: string): string | null {
  const canonical = F1_DRIVER_ALIASES[ascii(fullName).trim().toLowerCase()] ?? fullName;
  const clean = ascii(canonical).trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2) return null;
  const given = parts.slice(0, -1).join(' ');
  const family = parts[parts.length - 1];
  const first = parts[0];
  const code = (first.slice(0, 3) + family.slice(0, 3) + '01').toUpperCase();
  const folder = `${code}_${given}_${family}`;
  const path = `${given[0].toUpperCase()}/${folder}/${code.toLowerCase()}.png`;
  return (
    'https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_640/content/dam/fom-website/drivers/' +
    encodeURI(path)
  );
}
