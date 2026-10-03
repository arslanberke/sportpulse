/**
 * Saglayici katmaninin uyarilari.
 *
 * Bu katman hatalari bilerek yutuyor: bir kaynak dususe siradaki denenir, veri
 * yoksa kart gizlenir. Ancak hic iz birakmadan yutuldugunda bir kaynagin
 * bozuldugu yalnizca veri eksildiginde -- o da gunler sonra -- fark ediliyordu.
 *
 * Uyarilar uygulamada Metro cikisinda, senkron isinde Edge Function gunlugunde
 * gorunur. Tek satirlik ve "[providers]" onekli olmasi, gunlukte aranabilmesi
 * icindir.
 */

export interface ProviderIssue {
  source: string;
  kind: 'http' | 'request';
  status: number | null;
}

export type ReportProviderIssue = (issue: ProviderIssue) => void;

/** ESPN answers 403 to Deno's default `Deno/x` user agent (Edge Functions). */
export const PROVIDER_USER_AGENT = 'SportPulse/1.0';

export async function fetchProvider(
  source: string,
  url: string,
  onIssue?: ReportProviderIssue,
  policy: { timeoutMs?: number; retryDelayMs?: number; headers?: HeadersInit } = {},
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), policy.timeoutMs ?? 10_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': PROVIDER_USER_AGENT, ...policy.headers },
      });
      if (attempt === 0 && [502, 503, 504].includes(response.status)) {
        await response.body?.cancel();
      } else {
        const body = await response.arrayBuffer();
        return new Response([204, 205, 304].includes(response.status) ? null : body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    } catch {
      if (attempt === 1) {
        onIssue?.({ source, kind: 'request', status: null });
        throw new Error(`${source}: request failed`);
      }
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, policy.retryDelayMs ?? 250));
  }
  throw new Error(`${source}: request failed`);
}

/** Bir saglayici cagrisi istisna atti; sirada baskasi varsa o denenecek. */
export function warnProviderFailure(
  operation: string,
  provider: string,
  subject: string,
  error: unknown,
  onIssue?: ReportProviderIssue,
): void {
  onIssue?.({ source: `${provider}.${operation}`, kind: 'request', status: null });
  console.warn(`[providers] ${provider}.${operation} failed for ${subject}: ${error instanceof Error ? error.name : 'UnknownError'}`);
}

/**
 * Bir istek basarisiz durum kodu dondurdu. Cagiranin dondurecegi deger aynen
 * geri verilir, boylece uyari eklemek akisi degistirmez:
 *
 *   if (!res.ok) return warnHttp('espn.scoreboard', res, null);
 */
export function warnHttp<T>(
  source: string,
  response: Response,
  fallback: T,
  onIssue?: ReportProviderIssue,
): T {
  onIssue?.({ source, kind: 'http', status: response.status });
  console.warn(`[providers] ${source} HTTP ${response.status}`);
  return fallback;
}
