import { days, denseEvents, events as baseEvents, team } from './data.mjs';
import { channelLogos, leagueLogos, teamLogos } from './logos.mjs';

const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const params = new URLSearchParams(location.hash.slice(1));
const state = { screen: params.get('screen') ?? 'home', focus: params.get('focus') ?? 'all', theme: params.get('theme') ?? 'light', density: params.get('density') ?? 'normal', tone: params.get('tone') ?? 'all' };
const controls = ['screen', 'focus', 'theme', 'density', 'tone'].filter((k) => document.getElementById(k));

const byTime = (a, b) => a.time.localeCompare(b.time);
const live = baseEvents.find((e) => e.id === 'eng-esp');
let events = baseEvents, favs = [], today = [], sat = [], week = [];
const todayKey = days.find((d) => d.today).key;
const dayOf = (e) => days.find((d) => d.key === (e.day ?? todayKey));
const dayShort = (e) => e.day ? dayOf(e).short : 'Bugün';
const dayLong = (e) => e.day ? dayOf(e).long : 'Bugün';
function prepare() {
  events = state.density === 'dense' ? [...baseEvents, ...denseEvents] : baseEvents;
  favs = events.filter((e) => e.favorite);
  today = events.filter((e) => !e.day).sort(byTime);
  sat = events.filter((e) => e.day === 'sat').sort(byTime);
  week = days.map((d) => [d, events.filter((e) => (e.day ?? todayKey) === d.key).sort(byTime)]);
}
prepare();
const byKey = (list, key) => {
  const map = new Map();
  for (const e of list) { const k = key(e); if (!map.has(k)) map.set(k, []); map.get(k).push(e); }
  return [...map.entries()];
};
const scoreOf = (e, side) => e.sport === 'tennis' ? e.sets.at(-1)[side === 'home' ? 0 : 1] : e[side === 'home' ? 'homeScore' : 'awayScore'];
const liveLabel = (e) => e.sport === 'tennis' ? e.detail : e.minute;
const isPhoto = (abbr) => ['ALC', 'SIN', 'DJO', 'ZVE'].includes(abbr);

/* logo: gerçek görsel; yüklenmezse kısaltma görünür */
const logo = (abbr, size = 28, cls = '') => {
  const src = teamLogos[abbr];
  return `<span class="lg ${isPhoto(abbr) ? 'ph' : ''} ${cls}" style="--s:${size}px">${src ? `<img src="${h(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${h(abbr)}</i></span>`;
};
const pair = (e, size = 28, cls = '') => `<span class="pair ${cls}">${logo(e.homeAbbr, size)}${e.away ? logo(e.awayAbbr, size) : ''}</span>`;
const leagueLogo = (name, size = 16) => leagueLogos[name] ? `<img class="ll" src="${h(leagueLogos[name])}" alt="" style="--s:${size}px" onerror="this.remove()">` : '';
const channel = (name, cls = '') => channelLogos[name]
  ? `<span class="ch ${cls}"><img src="${h(channelLogos[name])}" alt="${h(name)}" onerror="this.replaceWith(this.alt)"></span>`
  : `<span class="ch txt ${cls}">${h(name)}</span>`;
const timeOrLive = (e) => e.live ? `<em class="live-tag">● ${h(liveLabel(e))}</em>` : `<b class="tm">${h(e.time)}</b>`;
const score = (e) => `<b class="sc">${scoreOf(e, 'home')}<i>–</i>${scoreOf(e, 'away')}</b>`;
const names = (e) => e.away ? `${h(e.home)} – ${h(e.away)}` : h(e.home);
const sub = (e) => e.round.split(' · ').pop();
const star = (e) => e.favorite ? '<i class="star">★</i>' : '';
const nm = (e) => `<span>${names(e)}${star(e)}</span>`;

const top = (title, sub, extra = '') => `<div class="s-top"><div><small>${h(sub)}</small><h1>${h(title)}</h1></div>${extra}<button class="s-ico" aria-label="Ara">⌕</button></div>`;
const dayStrip = () => `<div class="s-days">${days.map((d) => `<button class="${d.today ? 'on' : ''}"><span>${d.short}</span><b>${d.num}</b></button>`).join('')}</div>`;
const chips = () => `<div class="s-chips"><button class="on">Tümü</button><button><i class="dot"></i>Canlı ${events.filter((e) => e.live).length}</button><button>Futbol</button><button>Tenis</button><button>Basketbol</button><button>F1</button></div>`;
const seg = (items, on = 0) => `<div class="s-seg">${items.map((t, i) => `<button class="${i === on ? 'on' : ''}">${h(t)}</button>`).join('')}</div>`;

/* iki satır: ev / deplasman (logo + isim + skor) */
const twoLines = (e, size = 24, withScore = true) => `
  <div class="two">
    <div class="tl">${logo(e.homeAbbr, size)}<span>${h(e.home)}</span>${withScore && e.live && e.away ? `<b>${scoreOf(e, 'home')}</b>` : ''}</div>
    ${e.away ? `<div class="tl">${logo(e.awayAbbr, size)}<span>${h(e.away)}</span>${withScore && e.live ? `<b>${scoreOf(e, 'away')}</b>` : ''}</div>` : `<div class="tl sub"><span>${h(sub(e))}</span></div>`}
  </div>`;

/* 12 · SAKİN ----------------------------------------------------------- */
const calm = {
  home: () => `
    ${top('Bugün', 'Cuma, 26 Eylül')}
    ${dayStrip()}
    ${byKey(today, (e) => e.league).map(([lg, list]) => `
      <h4 class="cap">${h(lg)}</h4>
      ${list.map((e) => `<button class="c-row ${e.live ? 'live' : ''}" data-open="${e.id}">${pair(e, 26)}<span class="c-names">${nm(e)}<small>${h(e.channel)}</small></span>${e.live && e.away ? score(e) : timeOrLive(e)}</button>`).join('')}`).join('')}
    <h4 class="cap">Cumartesi</h4>
    ${sat.map((e) => `<button class="c-row" data-open="${e.id}">${pair(e, 26)}<span class="c-names">${nm(e)}<small>${h(e.league)} · ${h(e.channel)}</small></span>${timeOrLive(e)}</button>`).join('')}`,
};

/* 13 · IZGARA ---------------------------------------------------------- */
const gridCard = (e, wide = false) => `
  <button class="gr-card ${wide ? 'wide' : ''} ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <div class="gr-lg">${leagueLogo(e.league, 14)}<small>${h(e.league)}</small>${star(e)}</div>
    <div class="gr-logos">${logo(e.homeAbbr, wide ? 56 : 44)}${e.away ? `<em>${e.live ? `${scoreOf(e, 'home')}–${scoreOf(e, 'away')}` : 'vs'}</em>${logo(e.awayAbbr, wide ? 56 : 44)}` : ''}</div>
    <div class="gr-names"><span>${h(e.home)}</span>${e.away ? `<span>${h(e.away)}</span>` : `<span>${h(sub(e))}</span>`}</div>
    <div class="gr-foot">${timeOrLive(e)}${channel(e.channel, 'sm')}</div>
  </button>`;
const grid = {
  home: () => `
    ${top('Bu hafta', 'Cuma, 26 Eylül')}
    ${chips()}
    ${gridCard(events.find((e) => e.id === 'tur-fra'), true)}
    <h3 class="s-h3">Bugün</h3>
    <div class="gr">${today.filter((e) => e.id !== 'tur-fra').map((e) => gridCard(e)).join('')}</div>
    <h3 class="s-h3">Cumartesi</h3>
    <div class="gr">${sat.map((e) => gridCard(e)).join('')}</div>`,
};

/* 14 · ŞERİT ----------------------------------------------------------- */
const strip = {
  home: () => `
    ${top('Merhaba Berke', 'Cuma, 26 Eylül')}
    <div class="st-head"><span>★ Takımlarım</span><small>Tümü ›</small></div>
    <div class="st-strip">
      ${favs.map((e) => `<button class="st-tile ${e.live ? 'live' : ''}" data-open="${e.id}">
        <small>${dayLong(e)} · ${h(e.time)}</small>
        <div class="st-logos">${logo(e.homeAbbr, 46)}${logo(e.awayAbbr, 46)}</div>
        <strong>${h(e.home)}<br>${h(e.away)}</strong>
        <div class="st-ch">${channel(e.channel, 'sm')}</div>
      </button>`).join('')}
      <button class="st-tile add"><span>+</span><small>Takım ekle</small></button>
    </div>
    <div class="st-head"><span>Bugün</span><small>${today.length} maç</small></div>
    <div class="list">${today.filter((e) => !e.favorite).map((e) => `<button class="row ${e.live ? 'live' : ''}" data-open="${e.id}">${pair(e, 26, 'over')}<span class="c-names"><span>${names(e)}</span><small>${h(e.league)} · ${h(e.channel)}</small></span>${e.live && e.away ? score(e) : timeOrLive(e)}</button>`).join('')}</div>
    <div class="st-head"><span>Cumartesi</span><small>${sat.length} maç</small></div>
    <div class="list">${sat.filter((e) => !e.favorite).map((e) => `<button class="row" data-open="${e.id}">${pair(e, 26, 'over')}<span class="c-names"><span>${names(e)}</span><small>${h(e.league)} · ${h(e.channel)}</small></span>${timeOrLive(e)}</button>`).join('')}</div>`,
};

/* 15 · AJANDA ---------------------------------------------------------- */
const agendaRow = (e) => `
  <button class="ag-row ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <div class="ag-time">${e.live ? `<em>${h(liveLabel(e))}</em><i class="pulse"></i>` : `<b>${h(e.time)}</b>`}</div>
    <div class="ag-body">${pair(e, 30, 'over')}<div><strong>${names(e)}${star(e)}</strong><small>${h(e.league)}${e.live && e.away ? ` · <b>${scoreOf(e, 'home')}–${scoreOf(e, 'away')}</b>` : ''}</small></div>${channel(e.channel, 'sm')}</div>
  </button>`;
const agenda = {
  home: () => `
    <div class="ag-top"><small>EYLÜL 2026</small><h1>Ajanda</h1><button class="s-ico">⌕</button></div>
    ${dayStrip()}
    <h3 class="ag-day"><b>26</b><span>Cuma<small>Bugün · ${today.length} maç</small></span></h3>
    ${today.map(agendaRow).join('')}
    <h3 class="ag-day"><b>27</b><span>Cumartesi<small>${sat.length} maç</small></span></h3>
    ${sat.map(agendaRow).join('')}
    <h3 class="ag-day dim"><b>28</b><span>Pazar<small>Takip ettiğin maç yok</small></span></h3>`,
};

/* 16 · ODAK ------------------------------------------------------------ */
const focusCard = (e) => `
  <button class="fo-card ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <div class="fo-lg">${leagueLogo(e.league, 16)}<span>${h(e.league)} · ${h(e.round)}</span>${star(e)}</div>
    <div class="fo-mid">
      <div class="fo-side">${logo(e.homeAbbr, 56)}<span>${h(e.home)}</span></div>
      <div class="fo-center">${e.live && e.away ? `<b>${scoreOf(e, 'home')}<i>–</i>${scoreOf(e, 'away')}</b><em class="live-tag">● ${h(liveLabel(e))}</em>` : `<b>${h(e.time)}</b><small>${dayLong(e)}</small>`}</div>
      ${e.away ? `<div class="fo-side">${logo(e.awayAbbr, 56)}<span>${h(e.away)}</span></div>` : `<div class="fo-side"><span class="fo-round">${h(sub(e))}</span></div>`}
    </div>
    <div class="fo-foot">${channel(e.channel, 'sm')}<span>🔔 15 dk önce</span></div>
  </button>`;
const focus = {
  home: () => {
    const main = [events.find((e) => e.id === 'eng-esp'), events.find((e) => e.id === 'tur-fra'), events.find((e) => e.id === 'alc-sin')];
    const rest = events.filter((e) => !main.includes(e));
    return `
      ${top('Bugün', 'Cuma, 26 Eylül')}
      ${seg(['Bugün', 'Yarın', 'Hafta'])}
      ${main.map(focusCard).join('')}
      <h4 class="cap">Diğer ${rest.length} maç</h4>
      ${rest.map((e) => `<button class="c-row" data-open="${e.id}">${pair(e, 24)}<span class="c-names"><span>${names(e)}</span><small>${e.day ? `${dayShort(e)} · ` : ''}${h(e.league)}</small></span>${timeOrLive(e)}</button>`).join('')}`;
  },
};

/* 17 · MÜREKKEP -------------------------------------------------------- */
const ink = {
  home: () => `
    <div class="ik-top"><small>Cuma · 26 Eylül</small><h1>Bugün <em>${today.length}</em> maç, <em>${today.filter((e) => e.live).length}</em> canlı.</h1></div>
    ${byKey(today, (e) => e.league).map(([lg, list]) => `
      <div class="ik-lg">${leagueLogo(lg, 18)}<span>${h(lg)}</span><i></i></div>
      ${list.map((e) => `<button class="ik-row ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
        ${pair(e, 34, 'ring')}
        <div class="ik-body"><strong>${h(e.home)}</strong><strong>${e.away ? h(e.away) : h(sub(e))}</strong></div>
        <div class="ik-right">${e.live && e.away ? `<b>${scoreOf(e, 'home')}<br>${scoreOf(e, 'away')}</b>` : `<b class="mono">${h(e.time)}</b>`}<small>${e.live ? h(liveLabel(e)) : h(e.channel)}</small></div>
      </button>`).join('')}`).join('')}
    <div class="ik-lg"><span>Cumartesi</span><i></i></div>
    ${sat.map((e) => `<button class="ik-row ${e.favorite ? 'fav' : ''}" data-open="${e.id}">${pair(e, 34, 'ring')}<div class="ik-body"><strong>${h(e.home)}</strong><strong>${e.away ? h(e.away) : h(sub(e))}</strong></div><div class="ik-right"><b class="mono">${h(e.time)}</b><small>${h(e.channel)}</small></div></button>`).join('')}`,
};

/* 18 · MARKA ----------------------------------------------------------- */
const brand = {
  home: () => `
    <div class="br-hero">
      <div class="br-bar"><span class="br-mark">SP</span><b>SportPulse</b><button class="s-ico inv">⌕</button></div>
      <h1>Merhaba Berke</h1><small>Cuma, 26 Eylül · bugün ${today.length} maç, ${favs.filter((e) => !e.day).length} favori</small>
      ${dayStrip()}
    </div>
    <div class="br-sheet">
      <h3 class="s-h3">★ Takımlarım</h3>
      ${favs.map((e) => `<button class="br-card fav ${e.live ? 'live' : ''}" data-open="${e.id}">${twoLines(e, 26)}<div class="br-right">${timeOrLive(e)}<small>${dayShort(e)}</small>${channel(e.channel, 'sm')}</div></button>`).join('')}
      <h3 class="s-h3">Bugün</h3>
      ${today.filter((e) => !e.favorite).map((e) => `<button class="br-card ${e.live ? 'live' : ''}" data-open="${e.id}">${twoLines(e, 26)}<div class="br-right">${timeOrLive(e)}<small>${h(e.league)}</small>${channel(e.channel, 'sm')}</div></button>`).join('')}
      <h3 class="s-h3">Cumartesi</h3>
      ${sat.filter((e) => !e.favorite).map((e) => `<button class="br-card" data-open="${e.id}">${twoLines(e, 26)}<div class="br-right">${timeOrLive(e)}<small>${h(e.league)}</small>${channel(e.channel, 'sm')}</div></button>`).join('')}
    </div>`,
};

/* 19 · KANAL ----------------------------------------------------------- */
const channelDir = {
  home: () => {
    const liveNow = events.filter((e) => e.live);
    const rest = [...today, ...sat].filter((e) => !e.live);
    const chRow = (e) => `<button class="kn-row ${e.live ? 'live' : ''}" data-open="${e.id}">${pair(e, 26, 'over')}<span class="c-names">${nm(e)}<small>${h(e.league)}${e.day ? ` · ${dayLong(e)}` : ''}</small></span>${e.live && e.away ? score(e) : timeOrLive(e)}</button>`;
    return `
      ${top('Yayında', 'Cuma, 26 Eylül')}
      ${chips()}
      <section class="kn-card live"><header><em class="live-tag">● Şu an yayında</em></header>
        ${liveNow.map((e) => `<div class="kn-live">${channel(e.channel, 'md')}${chRow(e)}</div>`).join('')}
      </section>
      ${byKey(rest, (e) => e.channel).map(([ch, list]) => `
        <section class="kn-card"><header>${channel(ch, 'md')}<span>${h(ch)}</span><small>${list.length} maç</small></header>${list.map(chRow).join('')}</section>`).join('')}`;
  },
};

/* 20 · KRONOLOJİ ------------------------------------------------------- */
const timeSlots = () => [
  ...byKey(today.filter((e) => !e.live && e.time < '21:52'), (e) => e.time),
  ['Şimdi · 21:52', today.filter((e) => e.live), true],
  ...byKey(today.filter((e) => !e.live && e.time >= '21:52'), (e) => e.time),
  ...byKey(sat, (e) => e.time).map(([t, l]) => [`Cumartesi ${t}`, l]),
];
const timeline = {
  home: () => {
    const slots = timeSlots();
    return `
      ${top('Akış', 'Cuma, 26 Eylül')}
      ${chips()}
      <div class="tlx">
        ${slots.map(([label, list, now]) => `
          <div class="tlx-slot ${now ? 'now' : ''}"><div class="tlx-dot"></div><small class="tlx-lbl">${h(label)}</small>
            ${list.map((e) => `<button class="tlx-card ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
              ${twoLines(e, 24)}
              <div class="tlx-right">${e.live && e.away ? `<em class="live-tag">● ${h(liveLabel(e))}</em>` : timeOrLive(e)}${channel(e.channel, 'sm')}</div>
              <small class="tlx-lg">${leagueLogo(e.league, 12)}${h(e.league)}</small>
            </button>`).join('')}
          </div>`).join('')}
      </div>`;
  },
};

/* 21 · KOMPAKT --------------------------------------------------------- */
const compactRow = (e) => `
  <button class="kp-row ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <span class="kp-side">${logo(e.homeAbbr, 22)}<span>${h(e.home)}</span></span>
    <span class="kp-mid">${e.live && e.away ? `<b>${scoreOf(e, 'home')}–${scoreOf(e, 'away')}</b>` : e.away ? `<b class="tm">${h(e.time)}</b>` : `<b class="tm">${h(e.time)}</b>`}</span>
    <span class="kp-side r">${e.away ? `<span>${h(e.away)}</span>${logo(e.awayAbbr, 22)}` : `<span class="sub">${h(sub(e))}</span>`}</span>
  </button>`;
const compact = {
  home: () => `
    ${top('Program', 'Cuma, 26 Eylül')}
    ${seg(['Tümü', 'Futbol', 'Tenis', 'Basket', 'F1'])}
    <div class="kp-day">Bugün</div>
    ${byKey(today, (e) => e.league).map(([lg, list]) => `
      <div class="kp-lg">${leagueLogo(lg, 16)}<span>${h(lg)}</span><small>${h(list[0].channel)}</small></div>${list.map(compactRow).join('')}`).join('')}
    <div class="kp-day">Cumartesi</div>
    ${byKey(sat, (e) => e.league).map(([lg, list]) => `
      <div class="kp-lg">${leagueLogo(lg, 16)}<span>${h(lg)}</span><small>${h(list[0].channel)}</small></div>${list.map(compactRow).join('')}`).join('')}`,
};

/* 22 · FINAL (Set 5) ---------------------------------------------------
   hafta şeridi + kapalı favoriler + saate göre akış (20) + kanal düz yazı (17) */
/* sağ sütun: skor (canlı) ya da saat her zaman en sağda; durum (dakika/set) skorun solunda */
const fnScore = (e) => `<span class="fn-sc"><b>${scoreOf(e, 'home')}</b><b>${scoreOf(e, 'away')}</b></span>`;
const finalSide = (e, withDay) => e.live && e.away
  ? `<em class="live-tag">● ${h(liveLabel(e))}</em>${fnScore(e)}`
  : e.done
    ? `<small class="fn-day">MS</small>${fnScore(e)}`
    : `${withDay ? `<small class="fn-day">${dayShort(e)}</small>` : ''}${timeOrLive(e)}`;
const finalCard = (e, withDay = false) => `
  <button class="fn-card ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''} ${e.done ? 'done' : ''}" data-open="${e.id}">
    ${twoLines(e, 24, false)}
    <div class="fn-side">${finalSide(e, withDay)}</div>
    <small class="fn-lg">${leagueLogo(e.league, 12)}${h(e.league)}</small>
    <small class="fn-ch">${h(e.channel)}</small>
  </button>`;
const icons = {
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  week: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
};
const icon = (name, size = 16) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const finalTop = (title, subtitle, weekOn = false) => `
  <div class="s-top"><div><small>${h(subtitle)}</small><h1>${h(title)}</h1></div>
    <div class="fn-acts">
      <button class="fn-week ${weekOn ? 'on' : ''}" data-go="${weekOn ? 'home' : 'week'}">${icon('week', 14)}Hafta</button>
      <button class="s-ico" aria-label="Ara">${icon('search')}</button>
      <button class="s-ico" data-go="settings" aria-label="Ayarlar">${icon('gear')}</button>
    </div>
  </div>`;
const dayHead = ([d, list]) => `
  <div class="fn-dayhead ${d.today ? 'today' : ''} ${d.past ? 'past' : ''}">
    <b>${h(d.long)}</b><small>${d.num} ${h(d.month)}${d.today ? ' · Bugün' : d.past ? ' · Geçti' : ''}</small>
    <em>${list.length ? `${list.length} etkinlik` : 'Boş'}</em>
  </div>`;
const settingRow = (label, value, cls = '') => `<div class="row static fn-set ${cls}"><span>${h(label)}</span>${value}</div>`;
const sw = (on) => `<i class="fn-sw ${on ? 'on' : ''}"></i>`;
const chev = (v) => `<span class="r"><small>${h(v)}</small><em>›</em></span>`;
const finalDir = {
  home: () => `
    ${finalTop('Bugün', 'Cuma, 26 Eylül')}
    ${dayStrip()}
    <details class="fn-fold">
      <summary><i class="star">★</i><span>Favorilerim</span><b>${favs.length}</b><em>▸</em></summary>
      <div class="fn-fold-body">${favs.map((e) => finalCard(e, true)).join('')}</div>
    </details>
    ${chips()}
    <div class="tlx fn">
      ${timeSlots().map(([label, list, now]) => `
        <div class="tlx-slot ${now ? 'now' : ''}"><div class="tlx-dot"></div><small class="tlx-lbl">${h(label)}</small>
          ${list.map((e) => finalCard(e)).join('')}
        </div>`).join('')}
    </div>`,
  week: () => `
    ${finalTop('Bu hafta', '25 Eyl – 1 Eki', true)}
    <div class="fn-week-list">
      ${week.map(([d, list]) => `
        ${dayHead([d, list])}
        ${list.length ? list.map((e) => finalCard(e)).join('') : '<div class="fn-empty">Bu gün için etkinlik yok</div>'}`).join('')}
    </div>`,
  settings: () => `
    <div class="m-top"><button class="s-ico" data-back>‹</button><div><b>Ayarlar</b><small>Profil ve tercihler</small></div><span class="s-ico ghost"></span></div>
    <div class="fn-me">${logo('BJK', 44)}<div><strong>Berke</strong><small>Beşiktaş · 3 takım, 4 lig takipte</small></div></div>
    <section class="card"><header><span>Bildirimler</span></header>
      ${settingRow('Maç başlangıcı', sw(true))}
      ${settingRow('Gol bildirimi', sw(true))}
      ${settingRow('Hatırlatma', chev('15 dk önce'))}
    </section>
    <section class="card"><header><span>Görünüm</span></header>
      ${settingRow('Tema', chev(state.theme === 'dark' ? 'Koyu' : 'Açık'))}
      ${settingRow('Kanal gösterimi', chev('Yazı'))}
    </section>
    <section class="card"><header><span>Takip</span></header>
      ${settingRow('Takımlar', chev('3'))}
      ${settingRow('Ligler', chev('4'))}
      ${settingRow('Sporcular', chev('1'))}
    </section>
    <section class="card"><header><span>Hesap</span></header>
      ${settingRow('Gizlilik', chev(''))}
      ${settingRow('Hakkında', chev('1.4.0'))}
      ${settingRow('Çıkış yap', '', 'danger')}
    </section>`,
};

/* ORTAK · MAÇ + TAKIM ------------------------------------------------- */
const shared = {
  match() {
    const e = live;
    return `
      <div class="m-top"><button class="s-ico" data-back>‹</button><div>${leagueLogo(e.league, 14)}<b>${h(e.league)}</b><small>${h(e.round)}</small></div><button class="s-ico">☆</button></div>
      <div class="m-score">
        <div>${logo(e.homeAbbr, 64)}<span>${h(e.home)}</span></div>
        <div class="m-mid"><b>${e.homeScore}<i>–</i>${e.awayScore}</b><em class="live-tag">● ${h(e.minute)}</em></div>
        <div>${logo(e.awayAbbr, 64)}<span>${h(e.away)}</span></div>
      </div>
      <div class="m-info"><span>📺 ${h(e.channel)}</span><span>🔔 15 dk önce</span><span>📍 Wembley</span></div>
      ${seg(['Özet', 'İstatistik', 'Kadro'])}
      <section class="card">
        <header><span>Goller</span></header>
        ${e.timeline.filter((t) => t.type === 'goal').map((t) => `<div class="m-goal ${t.side}"><small>${h(t.min)}</small><strong>${h(t.who)}</strong><span>${h(t.note)}</span></div>`).join('')}
      </section>
      <section class="card">
        <header><span>Kısaca</span></header>
        ${[['41%', 'Topla oynama', '59%', 41], ['9', 'Şut', '14', 39], ['3', 'Korner', '6', 33]].map(([a, l, b, p]) => `<div class="m-stat"><b>${a}</b><div><small>${l}</small><i style="--p:${p}%"></i></div><b>${b}</b></div>`).join('')}
      </section>`;
  },
  team() {
    const t = team;
    const oppAbbr = { Trabzonspor: 'TRB', 'Amed SFK': 'AMD', Roma: 'ROM', Galatasaray: 'GS' };
    return `
      <div class="m-top"><button class="s-ico" data-back>‹</button><div>${leagueLogo(t.league, 14)}<b>${h(t.name)}</b><small>${h(t.league)}</small></div><button class="s-ico on">★</button></div>
      <div class="tm-head">${logo('BJK', 72)}<div><h2>${h(t.name)}</h2><small>${t.standing.pos}. sıra · ${t.standing.pts} puan</small><div class="tm-form">${t.form.map((f) => `<i class="f-${f}">${f}</i>`).join('')}</div></div></div>
      ${seg(['Maçlar', 'Puan', 'Kadro'])}
      <section class="card"><header><span>Sıradaki maçlar</span></header>
        ${t.fixtures.filter((f) => f.upcoming).map((f) => `<div class="row static">${logo(oppAbbr[f.opp], 26)}<span class="c-names"><span>${h(f.opp)}</span><small>${f.ha === 'E' ? 'Ev' : 'Deplasman'}${f.comp ? ` · ${f.comp}` : ''}</small></span><span class="r"><b class="tm">${h(f.result)}</b><small>${h(f.date)}</small></span></div>`).join('')}
      </section>
      <section class="card"><header><span>Son maç</span></header>
        <div class="row static">${logo('TRB', 26)}<span class="c-names"><span>Trabzonspor</span><small>Deplasman</small></span><span class="r"><b class="tm lost">1–2</b><small>20 Eyl</small></span></div>
      </section>`;
  },
};

const dirs = { calm, grid, strip, agenda, focus, ink, brand, channel: channelDir, timeline, compact, final: finalDir };
const tabs = [['home', 'Takvim'], ['explore', 'Keşfet'], ['me', 'Profil']];

function render() {
  document.querySelectorAll('.direction').forEach((sec) => {
    const dir = dirs[sec.dataset.dir];
    sec.querySelector('[data-app]').innerHTML = (dir[state.screen] ?? shared[state.screen] ?? dir.home).call(dir);
    sec.querySelector('[data-tabbar]').innerHTML = tabs.map(([id, l]) => `<button class="${({ home: 'home', week: 'home', team: 'explore', settings: 'me' })[state.screen] === id ? 'on' : ''}" data-tab="${id}"><i></i>${l}</button>`).join('');
    sec.querySelector('.app').scrollTop = 0;
  });
  const stage = document.getElementById('stage');
  stage.dataset.focus = state.focus;
  stage.dataset.theme = state.theme;
  stage.dataset.tone = state.tone;
  for (const k of controls) document.getElementById(k).value = state[k];
  history.replaceState(null, '', `#screen=${state.screen}&focus=${state.focus}&theme=${state.theme}&density=${state.density}&tone=${state.tone}`);
}
for (const k of controls) document.getElementById(k).addEventListener('change', (ev) => { state[k] = ev.target.value; prepare(); render(); });
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-open],[data-back],[data-tab],[data-go]');
  if (!t) return;
  if (t.dataset.open) state.screen = t.dataset.open === 'bjk-amed' ? 'team' : 'match';
  else if (t.dataset.go) state.screen = t.dataset.go;
  else if ('back' in t.dataset) state.screen = 'home';
  else if (t.dataset.tab === 'home') state.screen = 'home';
  else if (t.dataset.tab === 'explore') state.screen = 'team';
  else if (t.dataset.tab === 'me') state.screen = 'settings';
  render();
});
render();
