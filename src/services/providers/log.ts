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

/** Bir saglayici cagrisi istisna atti; sirada baskasi varsa o denenecek. */
export function warnProviderFailure(
  operation: string,
  provider: string,
  subject: string,
  error: unknown,
): void {
  console.warn(`[providers] ${provider}.${operation} failed for ${subject}: ${String(error)}`);
}

/**
 * Bir istek basarisiz durum kodu dondurdu. Cagiranin dondurecegi deger aynen
 * geri verilir, boylece uyari eklemek akisi degistirmez:
 *
 *   if (!res.ok) return warnHttp('espn.scoreboard', res, null);
 */
export function warnHttp<T>(source: string, response: Response, fallback: T): T {
  console.warn(`[providers] ${source} HTTP ${response.status} for ${response.url}`);
  return fallback;
}
