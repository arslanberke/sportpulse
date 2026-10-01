import { teamLogos as T, leagueLogos as L } from './logos.mjs';

const CHANNELS = ['beIN SPORTS 1', 'beIN SPORTS 2', 'beIN SPORTS 3', 'S Sport', 'S Sport Plus', 'TRT Spor', 'TRT 1', 'TV8', 'Exxen', 'A Spor', 'Tabii', 'Eurosport 1'];
const s = {
  mine: new Set(['beIN SPORTS 1', 'beIN SPORTS 2', 'beIN SPORTS 3', 'TRT Spor', 'TV8']),
  onlyMine: false,
  live: true,
  tab: 'form',
  notif: { pre: true, kick: true, goal: true, red: false, half: false, end: true, lineup: true },
};

const EVENTS = [
  { t: '19:00', live: '67\'', h: 'GS', a: 'FB', hn: 'Galatasaray', an: 'Fenerbahçe', hs: 1, as: 0, ch: ['beIN SPORTS 1'], lg: 'Süper Lig', fav: true },
  { t: '19:30', live: '2. çeyrek', h: 'EFS', a: 'OLY', hn: 'Anadolu Efes', an: 'Olympiakos', hs: 38, as: 41, ch: ['S Sport'], lg: 'EuroLeague' },
  { t: '19:45', live: '31\'', h: 'ARS', a: 'MCI', hn: 'Arsenal', an: 'Manchester City', hs: 0, as: 0, ch: ['beIN SPORTS 2'], lg: 'Premier Lig' },
  { t: '21:00', h: 'BJK', a: 'TRB', hn: 'Beşiktaş', an: 'Trabzonspor', ch: ['beIN SPORTS 3'], lg: 'Süper Lig' },
  { t: '22:00', h: 'RMA', a: 'BAR', hn: 'Real Madrid', an: 'Barcelona', ch: ['S Sport Plus'], lg: 'La Liga', fav: true },
  { t: '22:00', h: 'LIV', a: 'CHE', hn: 'Liverpool', an: 'Chelsea', ch: ['beIN SPORTS 1'], lg: 'Premier Lig' },
];
const img = (k) => (T[k] ? `<img src="${T[k]}" alt="">` : '');
const watchable = (e) => !s.onlyMine || e.ch.some((c) => s.mine.has(c));
const chText = (e) => e.ch.map((c) => (s.onlyMine || s.mine.has(c) ? `<b>${c}</b>` : `<s>${c}</s>`)).join(', ');

function home() {
  const live = EVENTS.filter((e) => e.live && watchable(e));
  const next = EVENTS.find((e) => !e.live && watchable(e));
  const top = live[0];
  const nowBlock = s.live && top
    ? `<div class="now"><div class="lbl"><i></i>Şu an ${live.length} maç canlı</div>
        <div class="m"><div class="tm"><div>${img(top.h)}${top.hn}</div><div>${img(top.a)}${top.an}</div></div>
        <div class="sc"><div>${top.hs}</div><div>${top.as}</div></div></div>
        <div class="meta"><em>${top.live}</em> · ${top.lg} · <b>${top.ch.join(', ')}</b></div>
        ${live.length > 1 ? `<div class="more">+${live.length - 1} canlı maç daha ›</div>` : ''}</div>`
    : `<div class="now idle"><div class="lbl"><i></i>Şu an canlı maç yok</div>
        <div class="meta" style="margin-top:6px">Sıradaki <b>${next ? next.t : '-'}</b> · ${next ? `${next.hn} – ${next.an} · <b>${next.ch[0]}</b>` : ''}</div></div>`;
  const rows = EVENTS.map((e) => {
    const off = !watchable(e);
    if (off) return '';
    return `<div class="tl"><div class="t ${e.live ? 'live' : ''}">${e.live ? 'CANLI' : e.t}</div>
      <div class="ev ${e.live ? 'live' : e.fav ? 'fav' : ''}"><div class="tm"><div>${img(e.h)}${e.hn}</div><div>${img(e.a)}${e.an}</div>
      <small>${e.live ? `<span style="color:var(--live);font-weight:700">${e.live}</span> · ` : ''}${e.lg} · ${chText(e)}</small></div>
      <div class="r"><div>${e.hs ?? ''}</div><div>${e.as ?? ''}</div></div></div></div>`;
  }).join('');
  const hidden = EVENTS.filter((e) => !watchable(e)).length;
  return `<div class="top"><h2>Bugün</h2><span class="ico" data-toggle-live title="Canlı var/yok">${s.live ? '●' : '○'}</span></div>
    <div class="days"><span>Pzt<b>28</b></span><span>Sal<b>29</b></span><span>Çar<b>30</b></span><span class="on">Per<b>1</b></span><span>Cum<b>2</b></span><span>Cmt<b>3</b></span><span>Paz<b>4</b></span></div>
    ${nowBlock}
    <div class="chips"><button class="on">Tümü</button><button><span class="st">★</span></button><button>Canlı</button>
      <button class="ch ${s.onlyMine ? 'on' : ''}" data-mine>📺 Kanallarım${s.onlyMine ? ` · ${s.mine.size}` : ''}</button></div>
    ${rows}
    ${hidden ? `<div class="note">Kanallarında olmayan ${hidden} maç gizlendi. <a style="color:var(--accent);font-weight:600" data-mine>Hepsini göster</a></div>` : ''}`;
}

function channels() {
  const rows = CHANNELS.map((c) => {
    const n = EVENTS.filter((e) => e.ch.includes(c)).length;
    return `<div class="row" data-ch="${c}"><div class="nm"><b>${c}</b><small>${n ? `Bugün ${n} maç` : 'Bugün maç yok'}</small></div>
      <span class="check ${s.mine.has(c) ? 'on' : ''}">✓</span></div>`;
  }).join('');
  return `<div class="top"><h2>Kanallarım</h2><span class="ico">✕</span></div>
    <p class="sheet-h">Hangi kanallara erişimin var? Ana ekrandaki "Kanallarım" çipi listeyi sadece bunlarla izleyebileceğin maçlara indirir. Ayarlar'dan da açılır.</p>
    <div class="sec"><h3>Seçili · ${s.mine.size}</h3><a data-all>${s.mine.size === CHANNELS.length ? 'Hiçbiri' : 'Hepsi'}</a></div>
    ${rows}`;
}

function notifs() {
  const items = [
    ['pre', 'Maçtan önce', '30 dk önce · kanal bilgisiyle'],
    ['lineup', 'Kadro açıklandı', 'İlk 11 belli olunca'],
    ['kick', 'Maç başladı', ''],
    ['goal', 'Gol', 'Skor ve golü atan'],
    ['red', 'Kırmızı kart', ''],
    ['half', 'Devre arası', ''],
    ['end', 'Maç sonu', 'Son skor'],
  ];
  const n = s.notif;
  const sample = n.goal
    ? `<div class="push"><img class="ap" src="img/app-icon.png" alt=""><div><b>GOL · Galatasaray 1–0 Fenerbahçe</b><span>Icardi 54' · beIN SPORTS 1</span></div><small>şimdi</small></div>`
    : n.kick
      ? `<div class="push"><img class="ap" src="img/app-icon.png" alt=""><div><b>Galatasaray – Fenerbahçe başladı</b><span>beIN SPORTS 1</span></div><small>şimdi</small></div>`
      : `<div class="push" style="opacity:.5"><img class="ap" src="img/app-icon.png" alt=""><div><b>Canlı bildirim kapalı</b><span>Sadece hatırlatıcı gelir</span></div></div>`;
  return `<div class="top"><h2></h2><span class="ico">✕</span></div>
    <div class="hdr">${img('GS')}<div><b>Galatasaray</b><small>Bildirimler · ★ favori</small></div></div>
    ${sample}
    <div class="sec"><h3>Bu takımın maçlarında</h3></div>
    ${items.map(([k, t, d]) => `<div class="row" data-n="${k}"><div class="nm"><b>${t}</b>${d ? `<small>${d}</small>` : ''}</div><span class="sw ${n[k] ? 'on' : ''}"></span></div>`).join('')}
    <p class="note">Varsayılanlar: ★ takımlarda hepsi açık (kırmızı kart, devre hariç); sadece takip ettiklerinde yalnızca "Maçtan önce". Sessiz saatlerde yalnızca maç sonu gelir.</p>`;
}

function lock() {
  return `<div class="island"><span>${img('GS')}<em>1</em></span><span style="color:#e5484d">67'</span><span><em>0</em>${img('FB')}</span></div>
    <div class="clock"><small>Perşembe 1 Ekim</small><b>19:52</b></div>
    <div class="la"><div class="hd"><span>Süper Lig · beIN SPORTS 1</span><em>● CANLI</em></div>
      <div class="sb"><div class="tq">${img('GS')}GS</div><div class="big">1 – 0<small>67'</small></div><div class="tq r">FB${img('FB')}</div></div>
      <div class="ft">⚽ <b>Icardi 54'</b> · 🟨 Fred 61'</div></div>
    <div class="wtitle">Ana ekran widget'ı</div>
    <div class="widget"><div class="l">● ŞU AN · 3 CANLI</div>
      <div class="wr">${img('GS')}Galatasaray – Fenerbahçe<span>1–0</span></div><div class="wc">67' · beIN SPORTS 1</div>
      <hr><div class="l g">SIRADAKİ · 21:00</div>
      <div class="wr">${img('BJK')}Beşiktaş – Trabzonspor</div><div class="wc">beIN SPORTS 3</div></div>`;
}

function detail() {
  const tabs = [['form', 'Form'], ['h2h', 'Aralarında'], ['table', 'Puan']];
  let body = '';
  if (s.tab === 'form') {
    const f = (k, n, r, nx) => `<div class="form">${img(k)}<b>${n}</b>${r.map((x) => `<span class="pill ${x}">${x}</span>`).join('')}</div><div class="note" style="padding-top:2px">${nx}</div>`;
    body = `<div class="sec"><h3>Son 5 maç</h3></div>
      ${f('BJK', 'Beşiktaş', ['G', 'G', 'B', 'M', 'G'], 'Son maç: Kasımpaşa 3–1 Beşiktaş deplasmanda M · iç sahada 4 maçtır yenilmiyor')}
      ${f('TRB', 'Trabzonspor', ['M', 'G', 'G', 'G', 'B'], 'Son maç: Trabzonspor 2–0 Samsunspor G · deplasmanda 2 galibiyet')}
      <p class="note">G galibiyet · B beraberlik · M mağlubiyet. Soldan sağa eskiden yeniye.</p>`;
  } else if (s.tab === 'h2h') {
    const m = [['12.04.26', 2, 1], ['03.11.25', 0, 0], ['18.03.25', 1, 3], ['22.10.24', 2, 2], ['04.03.24', 3, 1]];
    body = `<div class="h2hsum"><div><b>2</b>Beşiktaş</div><div><b>2</b>Beraberlik</div><div><b>1</b>Trabzonspor</div></div>
      <div class="bar2"><i style="flex:2;background:var(--ink)"></i><i style="flex:2;background:var(--faint)"></i><i style="flex:1;background:var(--accent)"></i></div>
      <div class="sec"><h3>Son 5 karşılaşma</h3></div>
      ${m.map(([d, a, b], i) => `<div class="h2h"><span class="d">${d}</span><span class="x ${a > b ? 'w' : ''}">${i % 2 ? 'Trabzonspor' : 'Beşiktaş'}</span><span class="s">${a}–${b}</span><span class="y ${b > a ? 'w' : ''}">${i % 2 ? 'Beşiktaş' : 'Trabzonspor'}</span></div>`).join('')}`;
  } else {
    const r = [[1, 'GS', 'Galatasaray', 8, 20], [2, 'FB', 'Fenerbahçe', 8, 19], [3, 'BJK', 'Beşiktaş', 8, 16], [4, 'GOZ', 'Göztepe', 8, 15], [5, 'TRB', 'Trabzonspor', 8, 14], [6, 'SAM', 'Samsunspor', 8, 13]];
    body = `<div class="sec"><h3>Süper Lig · 8. hafta</h3><a>Tümü ›</a></div>
      <table class="tbl"><tr><td>#</td><td style="color:var(--faint)">Takım</td><td class="n">O</td><td class="n">P</td></tr>
      ${r.map(([p, k, n, o, pt]) => `<tr class="${k === 'BJK' || k === 'TRB' ? 'me' : ''}"><td>${p}</td><td>${img(k)}${n}</td><td class="n">${o}</td><td class="n p">${pt}</td></tr>`).join('')}</table>`;
  }
  return `<div class="top"><span class="ico">‹</span><span class="ico">🔔</span></div>
    <div class="mh"><div class="lg2"><img src="${L['Süper Lig']}" alt="">Süper Lig · 8. hafta</div>
      <div class="vs"><div>${img('BJK')}Beşiktaş</div><strong>21:00<small>Bugün</small></strong><div>${img('TRB')}Trabzonspor</div></div>
      <div class="ch">📺 <b>beIN SPORTS 3</b> · Tüpraş Stadyumu</div></div>
    <div class="seg">${tabs.map(([k, l]) => `<button class="${s.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    ${body}`;
}

const SCREENS = [
  ['1 · Şimdi izle', 'Ana ekranın tepesi', home, 'Bugün'],
  ['2 · Kanallarım', 'Ana ekrandaki çipten açılır', channels, null],
  ['3 · Canlı bildirimler', 'Takım sayfasındaki 🔔', notifs, null],
  ['4 · Kilit ekranı ve widget', 'Live Activity + widget', lock, 'lock'],
  ['5 · Maç öncesi', 'Maç detayı', detail, null],
];
const stage = document.getElementById('stage');
const themeSel = document.getElementById('theme');
function render() {
  stage.innerHTML = SCREENS.map(([t, sub, fn, tab]) => `<div class="${themeSel.value}"><div class="cap-ph"><b>${t}</b>${sub}</div>
    <div class="phone ${tab === 'lock' ? 'lock' : ''}"><div class="status"></div><div class="scroll">${fn()}</div>
    ${tab && tab !== 'lock' ? `<div class="tabbar"><span class="on">Bugün</span><span>Keşfet</span><span>Profil</span></div>` : ''}</div></div>`).join('');
}
themeSel.onchange = render;
stage.addEventListener('click', (e) => {
  const el = e.target.closest('[data-mine],[data-ch],[data-all],[data-n],[data-tab],[data-toggle-live]');
  if (!el) return;
  const d = el.dataset;
  if ('mine' in d) s.onlyMine = !s.onlyMine;
  if (d.ch) s.mine.has(d.ch) ? s.mine.delete(d.ch) : s.mine.add(d.ch);
  if ('all' in d) s.mine = s.mine.size === CHANNELS.length ? new Set() : new Set(CHANNELS);
  if (d.n) s.notif[d.n] = !s.notif[d.n];
  if (d.tab) s.tab = d.tab;
  if ('toggleLive' in d) s.live = !s.live;
  render();
});
render();
