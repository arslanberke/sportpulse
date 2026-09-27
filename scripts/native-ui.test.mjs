import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8082';
const targets = await (await fetch('http://127.0.0.1:9226/json/list')).json();
const target = targets.find(item => item.type === 'page');
assert.ok(target, 'Start an isolated Chrome instance on port 9226');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
const testToken = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000001', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'ui-test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const sports = [{ id: 'football', name_tr: 'Futbol', name_en: 'Football', icon: 'football', sort_order: 1 }, { id: 'tennis', name_tr: 'Tenis', name_en: 'Tennis', icon: 'tennisball', sort_order: 2 }];
const stamp = (offset, hour = 20) => { const day = new Date(); day.setDate(day.getDate() + offset); day.setHours(hour, 0, 0, 0); return day.toISOString(); };
const league = { id: 'league', sport_id: 'football', name: 'Süper Lig', logo_url: null, artwork_url: null, external_ids: {}, season_start: null, season_end: null, sync_teams: true };
const player = { id: 'player', sport_id: 'tennis', league_id: 'atp', name: 'Jannik Sinner', country_code: 'IT', country_flag_url: null, headshot_url: null, rank: 1, rank_points: 10000, rank_synced_at: stamp(-12), leagues: { name: 'ATP Tour' } };
const events = Array.from({ length: 4 }, (_, i) => ({ id: `event${i}`, sport_id: 'football', league_id: 'league', home_team_id: 'team', away_team_id: `away${i}`, title: `Beşiktaş vs Rakip ${i + 1}`, starts_at: stamp(i), ends_at: null, status: 'scheduled', image_url: null, venue: 'Test stadium', venue_image_url: null, importance: 0, external_ids: {}, leagues: league, home_team: { name: 'Beşiktaş', logo_url: null }, away_team: { name: `Rakip ${i + 1}`, logo_url: null } }));
events.push({ ...events[0], id: 'tournament', sport_id: 'tennis', league_id: 'atp', title: 'Test Open', home_team_id: null, away_team_id: null, home_team: null, away_team: null, ends_at: stamp(6), leagues: { ...league, id: 'atp', name: 'ATP Tour' } });
const matches = [{ ...events[0], id: 'final', sport_id: 'tennis', parent_event_id: 'tournament', home_player_id: 'player', away_player_id: 'opponent', home_team: null, away_team: null, home_player: { name: 'Jannik Sinner', rank: 1 }, away_player: { name: 'Carlos Alcaraz', rank: 2 }, bracket: "Men's Singles", round: 'Final', starts_at: stamp(1) }, { ...events[0], id: 'qualifier', sport_id: 'tennis', parent_event_id: 'tournament', home_player_id: 'player', home_team: null, away_team: null, home_player: { name: 'Qualifying Player' }, away_player: { name: 'Opponent' }, bracket: "Men's Singles", round: 'Qualifying Final', starts_at: stamp(1) }];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 120000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function mock(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/auth/')) return user;
  const table = url.pathname.split('/').at(-1);
  let data = [];
  if (table === 'sports') data = sports;
  if (table === 'leagues') data = [league, { ...league, id: 'atp', sport_id: 'tennis', name: 'ATP Tour' }];
  if (table === 'user_follows') data = sports.map(s => ({ id: s.id, kind: 'sport', sport_id: s.id, league_id: null, team_id: null, created_at: stamp(0) }));
  if (table === 'user_favorites') data = [{ team_id: 'team', player_id: null }];
  if (table === 'profiles') data = [{ id: user.id, full_name: 'UI Test', country_code: 'TR', avatar_url: null, created_at: stamp(0) }];
  if (table === 'league_channels') data = [{ league_id: 'league', country_code: 'TR', channels: { id: 'tv', name: 'Test TV', country_code: 'TR', logo_url: null } }];
  if (table === 'players') data = [player];
  if (table === 'fixture_sync_health') data = [{ league_id: 'league', status: 'degraded', source: 'thesportsdb', last_attempt_at: stamp(0, 8), last_completed_at: stamp(0, 8), last_success_at: null, issue_count: 1 }];
  if (table === 'events') data = url.searchParams.has('parent_event_id') ? matches : url.searchParams.get('id')?.startsWith('eq.') ? events.filter(e => e.id === url.searchParams.get('id').slice(3)) : events;
  if (request.headers.Accept?.includes('vnd.pgrst.object')) return data[0] ?? null;
  return data;
}

socket.onmessage = async message => {
  const packet = JSON.parse(message.data);
  if (packet.method === 'Runtime.exceptionThrown') errors.push(packet.params.exceptionDetails.text);
  if (packet.method === 'Fetch.requestPaused') {
    const { requestId, request, resourceType } = packet.params;
    try {
      const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{height:100%;margin:0}#root{display:flex}body{overflow:hidden}</style></head><body><div id="root"></div><script src="/scripts/ui-test-entry.bundle?platform=web&dev=true&hot=false&lazy=false&transform.routerRoot=src%2Fapp"></script></body></html>';
      await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: resourceType === 'Document' ? 'text/html' : 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' }], body: Buffer.from(resourceType === 'Document' ? html : JSON.stringify(request.method === 'OPTIONS' ? {} : mock(request))).toString('base64') });
    } catch (error) { errors.push(error.message); }
  }
  const handler = pending.get(packet.id);
  if (handler) { clearTimeout(handler.timeout); pending.delete(packet.id); if (packet.error) handler.reject(new Error(packet.error.message)); else handler.resolve(packet.result); }
};
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const waitFor = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true)}else if(++n>1200){clearInterval(timer);reject(new Error('UI wait timed out'))}},100)})`);
const clickText = text => evaluate(`(()=>{const element=[...document.querySelectorAll('[role="button"],button')].filter(e=>e.textContent.includes(${JSON.stringify(text)})).sort((a,b)=>a.textContent.length-b.textContent.length)[0];if(!element)throw new Error('Button not found: '+${JSON.stringify(text)});element.click()})()`);
const selected = text => evaluate(`([...document.querySelectorAll('[role="button"]')].filter(e=>e.textContent.includes(${JSON.stringify(text)})).sort((a,b)=>a.textContent.length-b.textContent.length)[0])?.classList.contains('bg-primary')`);
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*sportpulse-test.invalid*' }, { urlPattern: `${origin}/*`, resourceType: 'Document' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('sb-sportpulse-test-auth-token', JSON.stringify({access_token:${JSON.stringify(testToken)},refresh_token:'ui-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:${JSON.stringify(user)}}));localStorage.setItem('sportpulse-theme',JSON.stringify({state:{preference:'dark'},version:0}));` });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: origin });
  await waitFor(`document.body.textContent.includes('Maçın var.') && document.body.textContent.includes('Rakip 4')`);
  assert.equal(await evaluate(`document.querySelectorAll('a[href="/event/event0"]').length`), 2);
  assert.equal(await evaluate(`document.querySelectorAll('a[href="/event/event3"]').length`), 1);
  await clickText('Diğer 2 maçı göster');
  assert.equal(await evaluate(`document.querySelectorAll('a[href="/event/event3"]').length`), 2);
  await clickText('Daha az göster');
  await clickText('Futbol');
  await clickText('Favoriler');
  assert.equal(await selected('Futbol'), true);
  await clickText('Tenis');
  assert.equal(await selected('Favoriler'), true);
  await waitFor(`document.body.textContent.includes('Bu filtrelere uyan')`);
  await clickText('Filtreleri temizle');
  await clickText('Canlı');
  await waitFor(`document.body.textContent.includes('Canlı skor bağlantısı henüz açık değil')`);
  await clickText('Canlı');
  await clickText('Filtreler');
  await waitFor(`document.body.textContent.includes('Yayın kanalı')`);
  await clickText('Test TV');
  await clickText('Etkinlikleri göster');
  await waitFor(`!document.body.textContent.includes('Yayın kanalı')`);
  assert.equal(await evaluate(`document.querySelectorAll('a[href="/event/tournament"]').length`), 0);
  await clickText('Filtreleri temizle');
  for (const width of [375, 390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `horizontal overflow at ${width}`);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/sportpulse-native-web-home.png', Buffer.from(screenshot.data, 'base64'));
  await clickText('Yarın');
  assert.equal(await evaluate(`document.querySelectorAll('a[href="/event/event0"]').length`), 1);
  await clickText('Filtreleri temizle');
  await evaluate(`document.querySelector('[aria-label="Ara"]').click()`);
  await waitFor(`document.querySelector('input')`);
  await evaluate(`(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Sinner');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await waitFor(`document.body.textContent.includes('Jannik Sinner · ATP Tour')`);
  await clickText('Jannik Sinner · ATP Tour');
  await waitFor(`document.body.textContent.includes('Sıralama güncel olmayabilir')`);
  await send('Page.navigate', { url: `${origin}/event/tournament` });
  await waitFor(`document.body.textContent.includes('Elemeleri de göster')`);
  assert.equal(await evaluate(`document.body.textContent.includes('Qualifying Player')`), false);
  await clickText('Sonuçlar');
  await waitFor(`document.body.textContent.includes('Mevcut kaynakta doğrulanmış maç sonuçları bulunmuyor')`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Page.navigate', { url: `${origin}/brand` });
  await waitFor(`document.querySelector('[data-testid="brand-phase"]')?.textContent==='ready'`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid="brand-launch"] svg path').length`), 2);
  assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-label')`), 'Yükleniyor…');
  await waitFor(`document.querySelector('[data-testid="loading-sweep"]')`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await waitFor(`!document.querySelector('[data-testid="loading-sweep"]')`);
  await send('Page.reload');
  await waitFor(`document.querySelector('[data-testid="brand-phase"]')?.textContent==='ready'`);
  assert.equal(await evaluate(`document.querySelector('[data-testid="loading-sweep"]')===null`), true);
  const brandShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/sportpulse-native-brand.png', Buffer.from(brandShot.data, 'base64'));
  assert.deepEqual(errors, []);
  console.log('Brand launch, loading accessibility and reduced-motion checks passed.');
  console.log('Native React Native Web checks passed: independent filters, favourites cap, channels, honest live/results states, player freshness, qualifying visibility, responsive widths. All API data was intercepted test data.');
} finally { socket.close(); }
