/**
 * Crests are stored as the provider's full-size file (ESPN 500px, TheSportsDB
 * up to 1000px, mirrored copies up to 260 KB) but drawn at 12-32pt. This asks
 * each host for a ~100px variant instead; unknown hosts are left as they are.
 */
const THUMB_PX = 96;

export function logoThumb(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const { hostname, pathname } = parsed;

  if (hostname === 'a.espncdn.com' && pathname.startsWith('/i/')) {
    return `https://a.espncdn.com/combiner/i?img=${pathname}&w=${THUMB_PX}&h=${THUMB_PX}`;
  }
  if (hostname.endsWith('thesportsdb.com') && /^\/images\/media\/.+\.(png|jpe?g)$/i.test(pathname)) {
    return `${url}/tiny`;
  }
  if (hostname.endsWith('.supabase.co') && pathname.startsWith('/storage/v1/object/public/')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${THUMB_PX}&h=${THUMB_PX}&fit=contain&output=webp`;
  }
  return url;
}
