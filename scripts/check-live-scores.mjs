import { fetchFootballLiveScores } from '../src/services/providers/api-sports-live.ts';

const key = process.env.API_SPORTS_FOOTBALL_KEY;
if (!key) {
  console.error('API_SPORTS_FOOTBALL_KEY gerekli. Anahtarı özel ortam değişkeni olarak verin; EXPO_PUBLIC_ kullanmayın.');
  process.exitCode = 1;
} else {
  try {
    const result = await fetchFootballLiveScores(key);
    console.log(`Kaynak: ${result.source} | Alınma zamanı: ${result.fetchedAt}`);
    console.log(`Kalan günlük istek: ${result.remainingRequests ?? 'kaynak bildirmedi'}`);
    console.log(`Canlı maç: ${result.scores.length} | Bu çalıştırma: 1 istek, otomatik yenileme yok.`);
    console.table(result.scores.map((score) => ({
      id: score.fixtureId,
      lig: score.leagueName,
      maç: `${score.homeTeam} vs ${score.awayTeam}`,
      skor: `${score.homeScore ?? '—'}–${score.awayScore ?? '—'}`,
      durum: score.status,
      dakika: score.elapsed ?? '—',
    })));
    if (result.scores.length === 0) console.log('Boş yanıt lig kapsamını kanıtlamaz; canlı maç varken tekrar doğrulanmalı.');
  } catch (error) {
    const message = error instanceof Error && /^API-Sports: [a-z_0-9]+$/.test(error.message)
      ? error.message
      : 'Canlı skor kontrolü başarısız.';
    console.error(message);
    process.exitCode = 1;
  }
}
