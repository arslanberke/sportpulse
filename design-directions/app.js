import { days, events, sports, team, today } from './data.mjs';

const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const params = new URLSearchParams(location.hash.slice(1));
const state = { screen: params.get('screen') ?? 'home', focus: params.get('focus') ?? 'all', sport: 'all', day: 'fri', liveOnly: false };

// --- ortak parcalar --------------------------------------------------------

function badge(abbr, color, size = 'md') {
  return `<span class="badge badge-${size}" style="--c:${h(color)}">${h(abbr)}</span>`;
}

function statusLine(e) {
  if (e.live) {
    if (e.sport === 'tennis') return `<span class="live"><i></i>${h(e.detail)}</span>`;
    return `<span class="live"><i></i>${h(e.minute)}</span>`;
  }
  return `<span class="when">${h(e.time)}</span>`;
}

function scoreBlock(e) {
  if (e.live && e.sport === 'tennis') {
    const cur = e.sets[e.sets.length - 1];
    return `<div class="score"><b>${cur[0]}</b><span class="sep">–</span><b>${cur[1]}</b></div>`;
  }
  if (e.live) return `<div class="score"><b>${e.homeScore}</b><span class="sep">–</span><b>${e.awayScore}</b></div>`;
  return `<div class="score scheduled"><b>${h(e.time)}</b></div>`;
}

function eventCard(e) {
  const single = !e.away;
  return `<article class="card ${e.live ? 'is-live' : ''} ${e.favorite ? 'is-fav' : ''} sport-${h(e.sport)}" data-open="${h(e.id)}">
    <div class="card-top">
      <span class="league">${h(e.league)}<em>${h(e.round)}</em></span>
      ${e.favorite ? '<span class="star">★</span>' : ''}
      ${statusLine(e)}
    </div>
    ${single
      ? `<div class="card-single">${badge(e.homeAbbr, e.homeColor, 'lg')}<div><strong>${h(e.home)}</strong><small>${h(e.round)}</small></div><div class="score scheduled"><b>${h(e.time)}</b></div></div>`
      : `<div class="card-body">
          <div class="side home">${badge(e.homeAbbr, e.homeColor)}<strong>${h(e.home)}</strong></div>
          ${scoreBlock(e)}
          <div class="side away">${badge(e.awayAbbr, e.awayColor)}<strong>${h(e.away)}</strong></div>
        </div>`}
    <div class="card-foot"><span class="chan">▸ ${h(e.channel)}</span><span class="venue">${h(e.venue)}</span></div>
  </article>`;
}

function tabbar(active) {
  return [['home', 'Program'], ['explore', 'Keşfet'], ['fav', 'Favoriler'], ['me', 'Ben']]
    .map(([id, l]) => `<button class="${id === active ? 'on' : ''}" data-tab="${id}"><i></i>${l}</button>`).join('');
}

// --- ekranlar -----------------------------------------------------------

function home() {
  const list = events.filter((e) =>
    (state.sport === 'all' || e.sport === state.sport) &&
    (!state.liveOnly || e.live) &&
    ((e.day ?? 'fri') === state.day || e.live));
  const favs = events.filter((e) => e.favorite);
  const liveCount = events.filter((e) => e.live).length;
  return `
    <header class="top">
      <div class="masthead"><span class="kicker">${h(today.label)} · ${h(today.date)}</span><h1>Bugün</h1></div>
      <div class="top-actions"><button class="ico" aria-label="Ara">⌕</button><button class="avatar">BA</button></div>
    </header>
    <div class="chips" role="tablist">
      ${sports.map((s) => `<button class="chip ${state.sport === s.id ? 'on' : ''}" data-sport="${s.id}">${s.label}</button>`).join('')}
      <button class="chip live-chip ${state.liveOnly ? 'on' : ''}" data-live><i></i>Canlı <b>${liveCount}</b></button>
    </div>
    <div class="days">${days.map((d) => `<button class="day ${state.day === d.key ? 'on' : ''} ${d.today ? 'today' : ''}" data-day="${d.key}"><span>${d.short}</span><b>${d.num}</b></button>`).join('')}</div>
    ${favs.length ? `<section class="favs"><div class="sec-head"><h2>Takımların</h2><span>${favs.length}</span></div>
      ${favs.map((e) => `<button class="fav-row" data-open="${h(e.id)}">${badge(e.homeAbbr, e.homeColor, 'sm')}<span class="fav-title">${h(e.home)} – ${h(e.away)}</span><span class="fav-meta">${h(e.day === 'sat' ? 'Cmt' : 'Bugün')} ${h(e.time)} · ${h(e.channel)}</span><span class="arr">→</span></button>`).join('')}
    </section>` : ''}
    <section class="list">
      <div class="sec-head"><h2>${state.liveOnly ? 'Şu an oynanıyor' : 'Program'}</h2><span>${list.length} maç</span></div>
      ${list.length ? list.map(eventCard).join('') : '<p class="empty">Bu seçimde maç yok.</p>'}
    </section>`;
}

function match() {
  const e = events.find((x) => x.id === 'eng-esp');
  return `
    <header class="top sub"><button class="ico" data-back>←</button><span class="crumb">${h(e.league)}</span><button class="ico">☆</button></header>
    <section class="hero" style="--home:${e.homeColor};--away:${e.awayColor}">
      <div class="hero-teams">
        <div class="hero-side">${badge(e.homeAbbr, e.homeColor, 'xl')}<strong>${h(e.home)}</strong></div>
        <div class="hero-score"><b>${e.homeScore}</b><span>–</span><b>${e.awayScore}</b><span class="live"><i></i>${h(e.minute)}</span></div>
        <div class="hero-side">${badge(e.awayAbbr, e.awayColor, 'xl')}<strong>${h(e.away)}</strong></div>
      </div>
      <div class="hero-meta"><span>${h(e.round)}</span><span>${h(e.venue)}</span><span>▸ ${h(e.channel)}</span></div>
    </section>
    <div class="seg"><button class="on">Özet</button><button>İstatistik</button><button>Kadro</button><button>Puan</button></div>
    <section class="timeline">
      ${e.timeline.map((t) => `<div class="tl ${t.side} ${t.type}">
        <span class="tl-min">${h(t.min)}</span>
        <span class="tl-ico">${t.type === 'goal' ? '⚽' : t.type === 'yellow' ? '<i class="yc"></i>' : '⇄'}</span>
        <span class="tl-who"><strong>${h(t.who)}</strong>${t.note ? `<small>${h(t.note)}</small>` : ''}</span>
      </div>`).join('')}
      <div class="tl ht"><span>Devre arası · 1–1</span></div>
    </section>
    <section class="stats">
      ${[['Topla oynama', 41, 59], ['Şut', 9, 14], ['İsabetli şut', 4, 7], ['Korner', 3, 6]].map(([l, a, b]) => `<div class="stat"><span>${a}${l === 'Topla oynama' ? '%' : ''}</span><div class="bar"><i style="flex:${a}"></i><i style="flex:${b}"></i></div><span>${b}${l === 'Topla oynama' ? '%' : ''}</span><small>${l}</small></div>`).join('')}
    </section>`;
}

function teamPage() {
  const t = team;
  return `
    <header class="top sub"><button class="ico" data-back>←</button><span class="crumb">Takım</span><button class="ico on">★</button></header>
    <section class="team-hero" style="--c:${t.color}">
      ${badge(t.abbr, t.color, 'xl')}
      <div><h1>${h(t.name)}</h1><span class="kicker">${h(t.league)} · ${h(t.country)}</span></div>
      <div class="form">${t.form.map((f) => `<i class="f-${f}">${f}</i>`).join('')}</div>
    </section>
    <div class="seg"><button class="on">Fikstür</button><button>Kadro</button><button>Puan durumu</button></div>
    <section class="standing">
      <div class="st-row head"><span>#</span><span>O</span><span>G</span><span>B</span><span>M</span><span>AV</span><span>P</span></div>
      <div class="st-row"><span>${t.standing.pos}</span><span>${t.standing.played}</span><span>${t.standing.won}</span><span>${t.standing.drawn}</span><span>${t.standing.lost}</span><span>${t.standing.gd}</span><b>${t.standing.pts}</b></div>
    </section>
    <section class="fixtures">
      <div class="sec-head"><h2>Sezon</h2><span>2026/27</span></div>
      ${t.fixtures.map((f) => `<div class="fx ${f.upcoming ? 'up' : ''} ${f.win === 'L' ? 'loss' : ''}">
        <span class="fx-date">${h(f.date)}</span>
        <span class="fx-ha">${f.ha}</span>
        <span class="fx-opp">${h(f.opp)}${f.comp ? `<em>${h(f.comp)}</em>` : ''}</span>
        <b class="fx-res">${h(f.result)}</b>
      </div>`).join('')}
    </section>
    <section class="squad">
      <div class="sec-head"><h2>Kadro</h2><span>${t.squad.length}+</span></div>
      ${t.squad.map((p) => `<div class="pl"><span class="pl-no">${p.no}</span><strong>${h(p.name)}</strong><span class="pl-pos">${p.pos}</span></div>`).join('')}
    </section>`;
}

const screens = { home, match, team: teamPage };

function render() {
  document.querySelectorAll('.direction').forEach((sec) => {
    sec.querySelector('[data-app]').innerHTML = screens[state.screen]();
    sec.querySelector('[data-tabbar]').innerHTML = tabbar(state.screen === 'home' ? 'home' : 'fav');
    sec.querySelector('.app').scrollTop = 0;
  });
  document.getElementById('stage').dataset.focus = state.focus;
  document.getElementById('screen').value = state.screen;
  document.getElementById('focus').value = state.focus;
  history.replaceState(null, '', `#screen=${state.screen}&focus=${state.focus}`);
}

document.getElementById('screen').addEventListener('change', (ev) => { state.screen = ev.target.value; render(); });
document.getElementById('focus').addEventListener('change', (ev) => { state.focus = ev.target.value; render(); });
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-open],[data-back],[data-sport],[data-live],[data-day],[data-tab]');
  if (!t) return;
  if (t.dataset.open) { state.screen = t.dataset.open === 'bjk-amed' ? 'team' : 'match'; }
  else if ('back' in t.dataset) state.screen = 'home';
  else if (t.dataset.sport) state.sport = t.dataset.sport;
  else if ('live' in t.dataset) state.liveOnly = !state.liveOnly;
  else if (t.dataset.day) state.day = t.dataset.day;
  else if (t.dataset.tab) state.screen = t.dataset.tab === 'home' ? 'home' : t.dataset.tab === 'fav' ? 'team' : state.screen;
  render();
});
render();
