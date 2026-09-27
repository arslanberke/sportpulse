import { days, events, team } from './data.mjs';

const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const params = new URLSearchParams(location.hash.slice(1));
const state = { screen: params.get('screen') ?? 'home', focus: params.get('focus') ?? 'all', theme: params.get('theme') ?? 'light' };

const live = events.find((e) => e.id === 'eng-esp');
const favs = events.filter((e) => e.favorite);
const byLeague = (list) => {
  const map = new Map();
  for (const e of list) { if (!map.has(e.league)) map.set(e.league, []); map.get(e.league).push(e); }
  return [...map.entries()];
};
const badge = (abbr, color, cls = '') => `<span class="bd ${cls}" style="--c:${h(color)}">${h(abbr)}</span>`;
const scoreOf = (e, side) => e.sport === 'tennis' ? e.sets.at(-1)[side === 'home' ? 0 : 1] : e[side === 'home' ? 'homeScore' : 'awayScore'];
const liveLabel = (e) => e.sport === 'tennis' ? e.detail : e.minute;
const dayLabel = (e) => e.day === 'sat' ? 'Cmt' : 'Bugün';

const header = (title, sub) => `
  <div class="s-top"><div><small>${h(sub)}</small><h1>${h(title)}</h1></div><button class="s-ico" aria-label="Ara">⌕</button></div>`;
const dayStrip = () => `<div class="s-days">${days.map((d) => `<button class="${d.today ? 'on' : ''}"><span>${d.short}</span><b>${d.num}</b></button>`).join('')}</div>`;
const sportChips = () => `<div class="s-chips"><button class="on">Tümü</button><button><i class="dot"></i>Canlı 2</button><button>Futbol</button><button>Tenis</button><button>Basketbol</button><button>F1</button></div>`;

const teamLine = (name, abbr, color, score, fav) => `
  <div class="s-tl">${badge(abbr, color, 'sm')}<span>${h(name)}</span>${fav ? '<i class="star">★</i>' : ''}${score !== undefined ? `<b>${h(score)}</b>` : ''}</div>`;

/* 09 · GRUPLU ---------------------------------------------------------- */
const groupedRow = (e) => `
  <button class="g-row ${e.live ? 'live' : ''}" data-open="${e.id}">
    <div class="g-teams">
      ${teamLine(e.home, e.homeAbbr, e.homeColor, e.live && e.away ? scoreOf(e, 'home') : undefined, e.favorite)}
      ${e.away ? teamLine(e.away, e.awayAbbr, e.awayColor, e.live ? scoreOf(e, 'away') : undefined) : `<div class="s-tl sub"><span>${h(e.round)}</span></div>`}
    </div>
    <div class="g-meta">${e.live ? `<em class="live-tag">● ${h(liveLabel(e))}</em>` : `<strong>${h(e.time)}</strong>`}<small>${h(e.channel)}</small></div>
  </button>`;
const grouped = {
  home() {
    const today = events.filter((e) => !e.day);
    return `
      ${header('Bugün', 'Cuma, 26 Eylül')}
      ${dayStrip()}
      ${sportChips()}
      <section class="g-card mine"><header><span>★ Takımlarım</span><small>${favs.length}</small></header>${favs.map(groupedRow).join('')}</section>
      ${byLeague(today.filter((e) => !e.favorite)).map(([league, list]) => `
        <section class="g-card"><header><span>${h(league)}</span><small>${list.length}</small></header>${list.map(groupedRow).join('')}</section>`).join('')}
      <div class="s-more">Cumartesi · 3 maç ›</div>`;
  },
};

/* 10 · SIRADAKİ -------------------------------------------------------- */
const nextRow = (e) => `
  <button class="n-row ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <div class="n-badges">${badge(e.homeAbbr, e.homeColor, 'md')}${e.away ? badge(e.awayAbbr, e.awayColor, 'md over') : ''}</div>
    <div class="n-body">
      <strong>${h(e.home)}${e.away ? ` – ${h(e.away)}` : ''}${e.favorite ? ' <i class="star">★</i>' : ''}</strong>
      <small>${h(e.league)} · ${h(e.channel)}</small>
    </div>
    <div class="n-right">${e.live
      ? (e.away ? `<b>${scoreOf(e, 'home')}–${scoreOf(e, 'away')}</b>` : '') + `<em class="live-tag">● ${h(liveLabel(e))}</em>`
      : `<b>${h(e.time)}</b><small>${h(dayLabel(e))}</small>`}</div>
  </button>`;
const next = {
  home() {
    const hero = events.find((e) => e.id === 'tur-fra');
    const rest = events.filter((e) => e !== hero);
    return `
      ${header('Bu hafta', 'Cuma, 26 Eylül')}
      ${sportChips()}
      <button class="n-hero" data-open="${hero.id}" style="--a:${hero.homeColor};--b:${hero.awayColor}">
        <div class="n-hero-art">${badge(hero.homeAbbr, hero.homeColor, 'lg light')}<span class="n-vs">VS</span>${badge(hero.awayAbbr, hero.awayColor, 'lg light')}</div>
        <div class="n-hero-info">
          <small>★ Sıradaki · ${h(hero.league)}</small>
          <strong>${h(hero.home)} – ${h(hero.away)}</strong>
          <div class="n-pills"><span class="pill accent">⏳ 2 sa 10 dk</span><span class="pill">21:45</span><span class="pill">📺 ${h(hero.channel)}</span></div>
        </div>
      </button>
      <h3 class="s-h3">Bugün</h3>
      <div class="n-list">${rest.filter((e) => !e.day).map(nextRow).join('')}</div>
      <h3 class="s-h3">Cumartesi</h3>
      <div class="n-list">${rest.filter((e) => e.day).map(nextRow).join('')}</div>`;
  },
};

/* 11 · ZAMAN ----------------------------------------------------------- */
const timeCard = (e) => `
  <button class="t-card ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
    <div class="t-time">${e.live ? `<em>● ${h(liveLabel(e))}</em>` : `<b>${h(e.time)}</b>`}<small>${h(e.channel)}</small></div>
    <div class="t-teams">
      ${teamLine(e.home, e.homeAbbr, e.homeColor, e.live && e.away ? scoreOf(e, 'home') : undefined)}
      ${e.away ? teamLine(e.away, e.awayAbbr, e.awayColor, e.live ? scoreOf(e, 'away') : undefined) : `<div class="s-tl sub"><span>${h(e.round)}</span></div>`}
      <small class="t-league">${h(e.league)}</small>
    </div>
  </button>`;
const time = {
  home() {
    const sections = [
      ['Şimdi canlı', events.filter((e) => e.live)],
      ['Bu akşam', events.filter((e) => !e.live && !e.day)],
      ['Cumartesi · 27 Eylül', events.filter((e) => e.day === 'sat')],
    ];
    return `
      ${header('Program', 'Bu hafta 6 maç takip ediyorsun')}
      ${dayStrip()}
      ${sections.map(([title, list]) => `
        <h3 class="s-h3 ${title.startsWith('Şimdi') ? 'live' : ''}">${h(title)}<small>${list.length}</small></h3>
        ${list.map(timeCard).join('')}`).join('')}`;
  },
};

/* ORTAK · MAÇ + TAKIM ------------------------------------------------- */
const shared = {
  match() {
    const e = live;
    return `
      <div class="m-top"><button class="s-ico" data-back>‹</button><div><b>${h(e.league)}</b><small>${h(e.round)}</small></div><button class="s-ico">☆</button></div>
      <div class="m-score">
        <div>${badge(e.homeAbbr, e.homeColor, 'lg')}<span>${h(e.home)}</span></div>
        <div class="m-mid"><b>${e.homeScore}<i>–</i>${e.awayScore}</b><em class="live-tag">● ${h(e.minute)}</em></div>
        <div>${badge(e.awayAbbr, e.awayColor, 'lg')}<span>${h(e.away)}</span></div>
      </div>
      <div class="m-info"><span>📺 ${h(e.channel)}</span><span>🔔 15 dk önce</span><span>📍 Wembley</span></div>
      <div class="s-seg"><button class="on">Özet</button><button>İstatistik</button><button>Kadro</button></div>
      <section class="g-card">
        <header><span>Goller</span></header>
        ${e.timeline.filter((t) => t.type === 'goal').map((t) => `<div class="m-goal ${t.side}"><small>${h(t.min)}</small><strong>${h(t.who)}</strong><span>${h(t.note)}</span></div>`).join('')}
      </section>
      <section class="g-card">
        <header><span>Kısaca</span></header>
        ${[['41%', 'Topla oynama', '59%', 41], ['9', 'Şut', '14', 39], ['3', 'Korner', '6', 33]].map(([a, l, b, p]) => `<div class="m-stat"><b>${a}</b><div><small>${l}</small><i style="--p:${p}%"></i></div><b>${b}</b></div>`).join('')}
      </section>`;
  },
  team() {
    const t = team;
    return `
      <div class="m-top"><button class="s-ico" data-back>‹</button><div><b>${h(t.name)}</b><small>${h(t.league)}</small></div><button class="s-ico on">★</button></div>
      <div class="tm-head">${badge(t.abbr, t.color, 'xl')}<div><h2>${h(t.name)}</h2><small>${t.standing.pos}. sıra · ${t.standing.pts} puan</small><div class="tm-form">${t.form.map((f) => `<i class="f-${f}">${f}</i>`).join('')}</div></div></div>
      <div class="s-seg"><button class="on">Maçlar</button><button>Puan</button><button>Kadro</button></div>
      <section class="g-card"><header><span>Sıradaki maçlar</span></header>
        ${t.fixtures.filter((f) => f.upcoming).map((f) => `<div class="g-row static"><div class="g-teams"><div class="s-tl">${badge(f.opp.slice(0, 3).toUpperCase(), '#7b8a82', 'sm')}<span>${h(f.opp)}</span><small class="ha">${f.ha === 'E' ? 'ev' : 'dep'}${f.comp ? ` · ${f.comp}` : ''}</small></div></div><div class="g-meta"><strong>${h(f.result)}</strong><small>${h(f.date)}</small></div></div>`).join('')}
      </section>
      <section class="g-card"><header><span>Son maç</span></header>
        <div class="g-row static"><div class="g-teams"><div class="s-tl">${badge('TRB', '#7a1e3a', 'sm')}<span>Trabzonspor</span><small class="ha">dep</small></div></div><div class="g-meta"><strong class="lost">1–2</strong><small>20 Eyl</small></div></div>
      </section>`;
  },
};

const dirs = { grouped, next, time };
const tabs = [['home', 'Takvim'], ['explore', 'Keşfet'], ['me', 'Profil']];

function render() {
  document.querySelectorAll('.direction').forEach((sec) => {
    const dir = dirs[sec.dataset.dir];
    sec.querySelector('[data-app]').innerHTML = (dir[state.screen] ?? shared[state.screen]).call(dir);
    sec.querySelector('[data-tabbar]').innerHTML = tabs.map(([id, l]) => `<button class="${({ home: 'home', team: 'explore' })[state.screen] === id ? 'on' : ''}" data-tab="${id}"><i></i>${l}</button>`).join('');
    sec.querySelector('.app').scrollTop = 0;
  });
  const stage = document.getElementById('stage');
  stage.dataset.focus = state.focus;
  stage.dataset.theme = state.theme;
  for (const k of ['screen', 'focus', 'theme']) document.getElementById(k).value = state[k];
  history.replaceState(null, '', `#screen=${state.screen}&focus=${state.focus}&theme=${state.theme}`);
}
for (const k of ['screen', 'focus', 'theme']) document.getElementById(k).addEventListener('change', (ev) => { state[k] = ev.target.value; render(); });
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-open],[data-back],[data-tab]');
  if (!t) return;
  if (t.dataset.open) state.screen = t.dataset.open === 'bjk-amed' ? 'team' : 'match';
  else if ('back' in t.dataset) state.screen = 'home';
  else if (t.dataset.tab === 'home') state.screen = 'home';
  else if (t.dataset.tab === 'explore') state.screen = 'team';
  render();
});
render();
