import { days, events, team } from './data.mjs';

const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const params = new URLSearchParams(location.hash.slice(1));
const state = { screen: params.get('screen') ?? 'home', focus: params.get('focus') ?? 'all', tab: 'today' };

const live = events.find((e) => e.id === 'eng-esp');
const favs = events.filter((e) => e.favorite);
const byLeague = () => {
  const map = new Map();
  for (const e of events) { if (!map.has(e.league)) map.set(e.league, []); map.get(e.league).push(e); }
  return [...map.entries()];
};
const badge = (abbr, color, cls = '') => `<span class="bd ${cls}" style="--c:${h(color)}">${h(abbr)}</span>`;
const score = (e) => e.live ? (e.sport === 'tennis' ? `${e.sets.at(-1)[0]}–${e.sets.at(-1)[1]}` : `${e.homeScore}–${e.awayScore}`) : e.time;
const status = (e) => e.live ? (e.sport === 'tennis' ? e.detail : e.minute) : (e.day === 'sat' ? 'Cmt' : 'Bugün');
const tabs = (active, items) => items.map(([id, l]) => `<button class="${id === active ? 'on' : ''}" data-tab="${id}"><i></i>${l}</button>`).join('');

/* =========================================================================
   05 · AKIŞ — Apple Sports mantığı, alt menü yok
   ========================================================================= */
const flow = {
  home() {
    return `
      <div class="f-top"><h1>Bugün</h1><button class="f-menu">•••</button></div>
      <div class="f-seg"><button>Dün</button><button class="on">Bugün</button><button>Yaklaşan</button></div>
      <div class="f-mine">${favs.map((e) => `<button class="f-mine-chip" data-open="${e.id}">${badge(e.homeAbbr, e.homeColor, 'sm')}<span>${h(e.home)}</span><small>${h(e.time)}</small></button>`).join('')}<button class="f-mine-chip add">+ <span>Takım ekle</span></button></div>
      ${byLeague().map(([league, list]) => `
        <section class="f-group">
          <header><span>${h(league)}</span><small>${list.length}</small></header>
          ${list.map((e) => `<button class="f-row ${e.live ? 'live' : ''}" data-open="${e.id}">
            <div class="f-teams">
              <div>${badge(e.homeAbbr, e.homeColor, 'sm')}<span>${h(e.home)}</span>${e.favorite ? '<i class="fav">★</i>' : ''}</div>
              ${e.away ? `<div>${badge(e.awayAbbr, e.awayColor, 'sm')}<span>${h(e.away)}</span></div>` : `<div><small>${h(e.round)}</small></div>`}
            </div>
            ${e.live && e.away
              ? `<div class="f-score" style="--a:${e.homeColor};--b:${e.awayColor}"><b>${e.sport === 'tennis' ? e.sets.at(-1)[0] : e.homeScore}</b><b>${e.sport === 'tennis' ? e.sets.at(-1)[1] : e.awayScore}</b></div><span class="f-min">${h(status(e))}</span>`
              : `<span class="f-time">${h(e.time)}<small>${h(e.channel)}</small></span>`}
          </button>`).join('')}
        </section>`).join('')}`;
  },
  match() {
    const e = live;
    return `
      <div class="f-sheet" style="--a:${e.homeColor};--b:${e.awayColor}">
        <div class="f-grab"></div>
        <button class="f-close" data-back>✕</button>
        <div class="f-hero">
          <div class="f-hero-t">${badge(e.homeAbbr, e.homeColor, 'xl')}<strong>${h(e.home)}</strong></div>
          <div class="f-hero-s"><b>${e.homeScore}</b><b>${e.awayScore}</b></div>
          <div class="f-hero-t">${badge(e.awayAbbr, e.awayColor, 'xl')}<strong>${h(e.away)}</strong></div>
        </div>
        <div class="f-hero-m"><span class="f-live">● ${h(e.minute)}</span><span>${h(e.league)} · ${h(e.round)}</span></div>
        <div class="f-dots"><i></i><i class="on"></i><i></i><i></i></div>
      </div>
      <div class="f-card">
        <h3>Goller</h3>
        ${e.timeline.filter((t) => t.type === 'goal').map((t) => `<div class="f-goal ${t.side}"><span>${h(t.min)}</span><strong>${h(t.who)}</strong><small>${h(t.note)}</small></div>`).join('')}
      </div>
      <div class="f-card">
        <h3>Maç istatistikleri</h3>
        ${[['Topla oynama', '41%', '59%', 41], ['Şut', 9, 14, 39], ['İsabetli', 4, 7, 36], ['Korner', 3, 6, 33]].map(([l, a, b, p]) => `<div class="f-stat"><span>${a}</span><div><small>${l}</small><i style="--p:${p}%;--a:${e.homeColor};--b:${e.awayColor}"></i></div><span>${b}</span></div>`).join('')}
      </div>
      <div class="f-card f-info"><div><small>Yayın</small><strong>${h(e.channel)}</strong></div><div><small>Stat</small><strong>Wembley</strong></div><div><small>Hakem</small><strong>Turpin</strong></div></div>`;
  },
  team() {
    const t = team;
    return `
      <div class="f-team-hero" style="--c:${t.color}">
        <button class="f-close light" data-back>‹</button>
        ${badge(t.abbr, t.color, 'xl light')}
        <h1>${h(t.name)}</h1><span>${h(t.league)} · ${t.standing.pos}. sıra · ${t.standing.pts} puan</span>
        <button class="f-follow on">✓ Takip ediliyor</button>
      </div>
      <div class="f-seg wide"><button class="on">Maçlar</button><button>Puan</button><button>Kadro</button><button>Haber</button></div>
      <section class="f-group">
        <header><span>Sonraki</span></header>
        ${t.fixtures.filter((f) => f.upcoming).map((f) => `<div class="f-row"><div class="f-teams"><div>${badge(f.opp.slice(0, 3).toUpperCase(), '#666', 'sm')}<span>${h(f.opp)}</span><small class="f-ha">${f.ha === 'E' ? 'ev' : 'dep'}${f.comp ? ` · ${f.comp}` : ''}</small></div></div><span class="f-time">${h(f.result)}<small>${h(f.date)}</small></span></div>`).join('')}
      </section>
      <section class="f-group">
        <header><span>Son maç</span></header>
        <div class="f-row"><div class="f-teams"><div>${badge('TRB', '#7a1e3a', 'sm')}<span>Trabzonspor</span><small class="f-ha">dep</small></div></div><div class="f-score lost"><b>1</b><b>2</b></div><span class="f-min">MS</span></div>
      </section>
      <section class="f-group">
        <header><span>Form</span></header>
        <div class="f-form">${t.form.map((f) => `<i class="f-${f}">${f}</i>`).join('')}<small>Son 5 maç</small></div>
      </section>`;
  },
};

/* =========================================================================
   06 · SAAT EKSENİ — gün bir zaman çizelgesi
   ========================================================================= */
const rail = {
  home() {
    const slots = [['13:00', [events[3]]], ['20:00', []], ['21:45', [events[0], events[1]]], ['Cumartesi', events.filter((e) => e.day === 'sat')]];
    return `
      <div class="r-top">
        <div><small>Cuma 26 Eylül</small><h1>Bugün 3 maçın var</h1></div>
        <button class="r-ico">⌕</button>
      </div>
      <div class="r-stories">
        ${[['BJK', team.color, 'Beşiktaş', 'Cmt'], ['TUR', '#e30a17', 'Türkiye', '21:45'], ['ALC', '#c8102e', 'Alcaraz', 'Canlı'], ['EFS', '#0e2b6b', 'Efes', 'Cmt']].map(([a, c, n, s], i) => `<button class="r-story ${i === 2 ? 'live' : ''}">${badge(a, c, 'lg')}<span>${n}</span><small>${s}</small></button>`).join('')}
        <button class="r-story add"><span class="bd lg plus">+</span><span>Ekle</span></button>
      </div>
      <div class="r-days">${days.map((d) => `<button class="${d.today ? 'on' : ''}"><span>${d.short}</span><b>${d.num}</b></button>`).join('')}</div>
      <div class="r-rail">
        ${slots.map(([t, list], i) => `
          <div class="r-slot ${i === 2 ? 'now' : ''} ${i === 3 ? 'tomorrow' : ''}">
            <div class="r-time"><span>${t}</span>${i === 2 ? '<em>ŞİMDİ</em>' : ''}</div>
            <div class="r-items">
              ${list.length ? list.map((e) => `<button class="r-card ${e.live ? 'live' : ''} ${e.favorite ? 'fav' : ''}" data-open="${e.id}">
                <small class="r-league">${h(e.league)}${e.favorite ? ' · ★' : ''}</small>
                <div class="r-line">${badge(e.homeAbbr, e.homeColor, 'sm')}<span>${h(e.home)}</span>${e.away ? `<b>${h(score(e))}</b><span class="r-away">${h(e.away)}</span>${badge(e.awayAbbr, e.awayColor, 'sm')}` : `<b class="r-single">${h(e.round)}</b>`}</div>
                ${e.live && e.sport !== 'tennis' ? `<div class="r-prog"><i style="width:${(78 / 90) * 100}%"></i><span>${h(e.minute)}</span></div>` : e.live ? `<small class="r-det">● ${h(e.detail)}</small>` : `<small class="r-det">▸ ${h(e.channel)}</small>`}
              </button>`).join('') : '<div class="r-empty">Boş</div>'}
            </div>
          </div>`).join('')}
      </div>`;
  },
  match() {
    const e = live;
    return `
      <div class="r-top sub"><button class="r-ico" data-back>‹</button><span>${h(e.league)}</span><button class="r-ico">☆</button></div>
      <div class="r-hero">
        <div class="r-hero-row">
          <div class="r-hero-t">${badge(e.homeAbbr, e.homeColor, 'lg')}<strong>${h(e.home)}</strong></div>
          <div class="r-hero-s"><b>${e.homeScore}</b><span>–</span><b>${e.awayScore}</b></div>
          <div class="r-hero-t">${badge(e.awayAbbr, e.awayColor, 'lg')}<strong>${h(e.away)}</strong></div>
        </div>
        <div class="r-prog big"><i style="width:${(78 / 90) * 100}%"></i><em style="left:50%"></em><span>${h(e.minute)}</span></div>
        <div class="r-hero-meta"><span>1. Yarı 1–1</span><span>${h(e.venue)}</span></div>
      </div>
      <div class="r-tl">
        ${e.timeline.map((t) => `<div class="r-tl-i ${t.side} ${t.type}"><span class="r-tl-min">${h(t.min)}</span><i></i><div><strong>${h(t.who)}</strong><small>${t.type === 'goal' ? 'Gol' : t.type === 'yellow' ? 'Sarı kart' : 'Değişiklik'}${t.note ? ` · ${h(t.note)}` : ''}</small></div></div>`).join('')}
        <div class="r-tl-i ht"><span class="r-tl-min">45'</span><i></i><div><strong>Devre arası</strong><small>1–1</small></div></div>
      </div>`;
  },
  team() {
    const t = team;
    return `
      <div class="r-top sub"><button class="r-ico" data-back>‹</button><span>Takım</span><button class="r-ico on">★</button></div>
      <div class="r-team">${badge(t.abbr, t.color, 'xl')}<div><h1>${h(t.name)}</h1><small>${h(t.league)} · ${t.standing.pos}. · ${t.standing.pts} P</small><div class="r-form">${t.form.map((f) => `<i class="f-${f}"></i>`).join('')}</div></div></div>
      <div class="r-tabs"><button class="on">Sezon</button><button>Kadro</button><button>Puan durumu</button></div>
      <div class="r-rail season">
        ${[['Eylül', t.fixtures.slice(0, 2)], ['Ekim', t.fixtures.slice(2)]].map(([m, list]) => `
          <div class="r-slot"><div class="r-time"><span>${m}</span></div><div class="r-items">
            ${list.map((f) => `<div class="r-card ${f.upcoming ? '' : 'played'} ${f.win === 'L' ? 'loss' : ''}"><small class="r-league">${f.date} · ${f.ha === 'E' ? 'Ev' : 'Deplasman'}${f.comp ? ` · ${f.comp}` : ''}</small><div class="r-line">${badge(f.opp.slice(0, 3).toUpperCase(), '#777', 'sm')}<span>${h(f.opp)}</span><b>${h(f.result)}</b></div></div>`).join('')}
          </div></div>`).join('')}
      </div>`;
  },
};

/* =========================================================================
   07 · DERGİ — günün brifingi, tipografi öncelikli
   ========================================================================= */
const mag = {
  home() {
    const lead = events.find((e) => e.id === 'tur-fra');
    return `
      <div class="m-mast"><span>Cuma, 26 Eylül</span><h1>Akşam <em>programın</em></h1></div>
      <article class="m-lead" data-open="${lead.id}">
        <small>★ SENİN MAÇIN · ${h(lead.league)}</small>
        <h2>Türkiye, Fransa'yı <em>Rams Park'ta</em> ağırlıyor.</h2>
        <p>Saat 21:45 · ATV canlı. Milliler A Ligi'nde ikinci maçına çıkıyor.</p>
        <div class="m-lead-t">${badge(lead.homeAbbr, lead.homeColor)}<b>vs</b>${badge(lead.awayAbbr, lead.awayColor)}</div>
      </article>
      <section class="m-sec">
        <h3>Şu an oynanıyor</h3>
        ${events.filter((e) => e.live).map((e) => `<button class="m-live" data-open="${e.id}"><span class="m-dot"></span><span class="m-live-t">${h(e.home)} <b>${h(score(e))}</b> ${h(e.away)}</span><small>${h(status(e))} · ${h(e.league)}</small></button>`).join('')}
      </section>
      <section class="m-sec">
        <h3>Bugün</h3>
        ${events.filter((e) => !e.live && (e.day ?? 'fri') === 'fri').map((e) => `<button class="m-line" data-open="${e.id}"><b>${h(e.time)}</b><span>${h(e.home)}${e.away ? ` – ${h(e.away)}` : ''}${e.favorite ? ' <i>★</i>' : ''}</span><small>${h(e.league)} · ${h(e.channel)}</small></button>`).join('')}
        <h3>Cumartesi</h3>
        ${events.filter((e) => e.day === 'sat').map((e) => `<button class="m-line" data-open="${e.id}"><b>${h(e.time)}</b><span>${h(e.home)}${e.away ? ` – ${h(e.away)}` : ''}${e.favorite ? ' <i>★</i>' : ''}</span><small>${h(e.league)} · ${h(e.channel)}</small></button>`).join('')}
      </section>
      <section class="m-sec m-note"><h3>Not</h3><p>Beşiktaş cumartesi Amed'i konuk ediyor; kadroda Vlahović'in dönüşü bekleniyor. Maç beIN SPORTS 1'de.</p></section>`;
  },
  match() {
    const e = live;
    return `
      <div class="m-sub"><button data-back>‹ Program</button><span>${h(e.league)}</span></div>
      <div class="m-mast"><span>${h(e.round)} · Wembley · ${h(e.minute)}</span><h1>İspanya <em>Wembley'de</em> önde.</h1></div>
      <div class="m-score"><div>${badge(e.homeAbbr, e.homeColor, 'lg')}<span>${h(e.home)}</span></div><b>${e.homeScore}<i>–</i>${e.awayScore}</b><div>${badge(e.awayAbbr, e.awayColor, 'lg')}<span>${h(e.away)}</span></div></div>
      <p class="m-dek">Yamal'ın iki asistiyle konuklar 71'de öne geçti; İngiltere Palmer'ı oyuna aldı. <span class="m-dot"></span> <b>${h(e.minute)}</b></p>
      <section class="m-sec">
        <h3>Anlar</h3>
        ${e.timeline.map((t) => `<div class="m-mom ${t.type}"><b>${h(t.min)}</b><span>${t.type === 'goal' ? `<strong>GOL</strong> ${h(t.who)}` : t.type === 'yellow' ? `<i class="yc"></i> ${h(t.who)}` : `⇄ ${h(t.who)}`}${t.note ? ` <small>(${h(t.note)})</small>` : ''} · <small>${t.side === 'home' ? 'ENG' : 'ESP'}</small></span></div>`).join('')}
      </section>
      <section class="m-sec m-stats">
        <h3>Sayılarla</h3>
        ${[['Topla oynama', '41', '59'], ['Şut', '9', '14'], ['İsabetli şut', '4', '7'], ['Korner', '3', '6']].map(([l, a, b]) => `<div><b>${a}</b><span>${l}</span><b>${b}</b></div>`).join('')}
      </section>`;
  },
  team() {
    const t = team;
    return `
      <div class="m-sub"><button data-back>‹ Geri</button><span>Takım</span></div>
      <div class="m-mast team"><span>${h(t.league)} · ${h(t.country)} · Takip ediliyor ★</span><h1>${h(t.name)}</h1><p>Ligde 3. sırada, son beş maçta üç galibiyet. Cumartesi Amed'i, hafta içi Roma'yı ağırlıyor.</p></div>
      <div class="m-kpi"><div><b>${t.standing.pos}.</b><span>Sıra</span></div><div><b>${t.standing.pts}</b><span>Puan</span></div><div><b>${t.standing.gd}</b><span>Averaj</span></div><div><b>${t.form.join('')}</b><span>Form</span></div></div>
      <section class="m-sec"><h3>Fikstür</h3>
        ${t.fixtures.map((f) => `<div class="m-line static ${f.win === 'L' ? 'loss' : ''}"><b>${h(f.date)}</b><span>${f.ha === 'E' ? '' : '@ '}${h(f.opp)}${f.comp ? ` <small>${f.comp}</small>` : ''}</span><small class="m-res">${h(f.result)}</small></div>`).join('')}
      </section>
      <section class="m-sec"><h3>Kadro</h3><p class="m-squad">${t.squad.map((p) => `<span><b>${p.no}</b> ${h(p.name)} <small>${p.pos}</small></span>`).join('')}</p></section>`;
  },
};

/* =========================================================================
   08 · YOĞUN — FotMob disiplini
   ========================================================================= */
const dense = {
  home() {
    const groups = [['★ Takımlarım', favs], ...byLeague()];
    return `
      <div class="d-top"><h1>Maçlar</h1><div><button class="d-ico">⌕</button><button class="d-ico">≡</button></div></div>
      <div class="d-days">${days.map((d) => `<button class="${d.today ? 'on' : ''}">${d.today ? 'Bugün' : `${d.short} ${d.num}`}</button>`).join('')}</div>
      <div class="d-filters"><button class="on">Tümü</button><button><i></i>Canlı 2</button><button>Futbol</button><button>Tenis</button><button>Basket</button></div>
      ${groups.map(([name, list], gi) => `
        <section class="d-group ${gi === 0 ? 'mine' : ''}">
          <header>${gi === 0 ? '' : badge(name.slice(0, 2).toUpperCase(), '#999', 'xs')}<span>${h(name)}</span><small>${list.length}</small><i>⌄</i></header>
          ${list.map((e) => `<button class="d-row ${e.live ? 'live' : ''}" data-open="${e.id}">
            <span class="d-st">${e.live ? `<b>${h(status(e)).replace(' Set', 'S')}</b>` : h(e.time)}</span>
            <div class="d-teams">
              <div>${badge(e.homeAbbr, e.homeColor, 'xs')}<span>${h(e.home)}</span>${e.favorite ? '<i>★</i>' : ''}</div>
              ${e.away ? `<div>${badge(e.awayAbbr, e.awayColor, 'xs')}<span>${h(e.away)}</span></div>` : `<div><small>${h(e.round)}</small></div>`}
            </div>
            ${e.away ? `<div class="d-sc">${e.live ? `<b>${e.sport === 'tennis' ? e.sets.at(-1)[0] : e.homeScore}</b><b>${e.sport === 'tennis' ? e.sets.at(-1)[1] : e.awayScore}</b>` : `<small>${h(e.channel)}</small>`}</div>` : `<div class="d-sc"><small>${h(e.channel)}</small></div>`}
            <span class="d-bell">${e.live ? '' : '🔔'}</span>
          </button>`).join('')}
        </section>`).join('')}`;
  },
  match() {
    const e = live;
    return `
      <div class="d-top sub"><button class="d-ico" data-back>‹</button><div class="d-title"><b>${h(e.league)}</b><small>${h(e.round)}</small></div><button class="d-ico">☆</button></div>
      <div class="d-hero">
        <div>${badge(e.homeAbbr, e.homeColor, 'lg')}<span>${h(e.home)}</span></div>
        <div class="d-hero-s"><b>${e.homeScore} - ${e.awayScore}</b><em>● ${h(e.minute)}</em><small>(1–1)</small></div>
        <div>${badge(e.awayAbbr, e.awayColor, 'lg')}<span>${h(e.away)}</span></div>
      </div>
      <div class="d-tabs"><button class="on">Özet</button><button>İstatistik</button><button>Kadro</button><button>H2H</button><button>Puan</button></div>
      <section class="d-card">
        ${e.timeline.map((t) => `<div class="d-ev ${t.side}"><span class="d-ev-l">${t.side === 'home' ? `<strong>${h(t.who)}</strong>${t.note ? `<small>${h(t.note)}</small>` : ''}` : ''}</span><span class="d-ev-m">${t.type === 'goal' ? '⚽' : t.type === 'yellow' ? '<i class="yc"></i>' : '⇄'}<small>${h(t.min)}</small></span><span class="d-ev-r">${t.side === 'away' ? `<strong>${h(t.who)}</strong>${t.note ? `<small>${h(t.note)}</small>` : ''}` : ''}</span></div>`).join('')}
        <div class="d-ht">DA 1–1</div>
      </section>
      <section class="d-card d-table">
        <div class="d-th"><span>ENG</span><span></span><span>ESP</span></div>
        ${[['41%', 'Topla oynama', '59%'], ['9', 'Şut', '14'], ['4', 'İsabetli şut', '7'], ['3', 'Korner', '6'], ['11', 'Faul', '9'], ['1', 'Sarı kart', '2']].map(([a, l, b]) => `<div class="d-tr"><b>${a}</b><span>${l}</span><b>${b}</b></div>`).join('')}
      </section>`;
  },
  team() {
    const t = team;
    return `
      <div class="d-top sub"><button class="d-ico" data-back>‹</button><div class="d-title"><b>${h(t.name)}</b><small>${h(t.league)}</small></div><button class="d-ico on">★</button></div>
      <div class="d-team">${badge(t.abbr, t.color, 'lg')}<div class="d-kpis"><div><b>${t.standing.pos}.</b><small>Sıra</small></div><div><b>${t.standing.pts}</b><small>Puan</small></div><div><b>${t.standing.won}-${t.standing.drawn}-${t.standing.lost}</b><small>G-B-M</small></div><div><b>${t.standing.gd}</b><small>AV</small></div></div></div>
      <div class="d-tabs"><button class="on">Fikstür</button><button>Kadro</button><button>Puan</button><button>İstatistik</button><button>Transfer</button></div>
      <section class="d-group"><header><span>Süper Lig</span></header>
        ${t.fixtures.filter((f) => !f.comp).map((f) => `<div class="d-row"><span class="d-st">${h(f.date)}</span><div class="d-teams one">${badge(f.opp.slice(0, 3).toUpperCase(), '#888', 'xs')}<span>${f.ha === 'D' ? '@ ' : ''}${h(f.opp)}</span></div><div class="d-sc"><b class="${f.win === 'L' ? 'loss' : f.upcoming ? 'up' : ''}">${h(f.result)}</b></div></div>`).join('')}
      </section>
      <section class="d-group"><header><span>Avrupa Ligi</span></header>
        ${t.fixtures.filter((f) => f.comp).map((f) => `<div class="d-row"><span class="d-st">${h(f.date)}</span><div class="d-teams one">${badge('ROM', '#8e1b3a', 'xs')}<span>${h(f.opp)}</span></div><div class="d-sc"><b class="up">${h(f.result)}</b></div></div>`).join('')}
      </section>
      <section class="d-group"><header><span>Kadro</span><small>${t.squad.length}+</small></header>
        ${t.squad.map((p) => `<div class="d-row pl"><span class="d-st">${p.no}</span><div class="d-teams one"><span>${h(p.name)}</span></div><div class="d-sc"><small>${p.pos}</small></div></div>`).join('')}
      </section>`;
  },
};

const dirs = { flow, rail, mag, dense };
const tabsets = {
  rail: [['home', 'Gün'], ['fav', 'Takımlarım'], ['explore', 'Keşfet'], ['me', 'Ben']],
  mag: [['home', 'Program'], ['fav', 'Takip'], ['explore', 'Ara']],
  dense: [['home', 'Maçlar'], ['live', 'Canlı'], ['fav', 'Takip'], ['news', 'Haber'], ['me', 'Profil']],
};

function render() {
  document.querySelectorAll('.direction').forEach((sec) => {
    const dir = sec.dataset.dir;
    sec.querySelector('[data-app]').innerHTML = dirs[dir][state.screen]();
    const tb = sec.querySelector('[data-tabbar]');
    if (tb) tb.innerHTML = tabs(state.screen === 'home' ? 'home' : 'fav', tabsets[dir]);
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
  const t = ev.target.closest('[data-open],[data-back],[data-tab]');
  if (!t) return;
  if (t.dataset.open) state.screen = t.dataset.open === 'bjk-amed' ? 'team' : 'match';
  else if ('back' in t.dataset) state.screen = 'home';
  else if (t.dataset.tab) state.screen = t.dataset.tab === 'home' ? 'home' : t.dataset.tab === 'fav' ? 'team' : state.screen;
  render();
});
render();
