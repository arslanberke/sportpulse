import { draw, events, filterDraw, filterEvents, isFavorite, players, searchCatalog, teams } from './model.mjs';

const app = document.querySelector('#app');
const scroll = document.querySelector('#app-scroll');
const sheetRoot = document.querySelector('#sheet-root');
const nav = document.querySelector('.bottom-nav');
const state = {
  scene: 'home', player: 'sinner', team: 'bjk', match: 'derby',
  sport: 'all', favoritesOnly: false, liveOnly: false, day: 14, league: '', channel: '',
  favoriteIds: new Set(['bjk', 'sinner', 'rybakina']), collapsed: false, showAllFavorites: false,
  query: '', drawTour: 'ATP', drawTime: 'today', drawRound: 'all',
  reminders: new Set(), effects: true, compact: false,
};
try { state.collapsed = localStorage.getItem('sportpulse-lab.favoritesCollapsed') === '1'; } catch {}
let sheetOpener;
let toastTimer;
const history = [];
const h = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, className = '') => `<svg class="icon ${h(className)}" aria-hidden="true"><use href="#i-${h(name)}"/></svg>`;
const selected = (condition) => condition ? ' active' : '';
const sportIcon = (sport) => sport === 'football' ? 'football' : sport === 'tennis' ? 'tennis' : 'grid';
const roundName = (round) => ({ final: 'Final', semi: 'Yarı final', quarter: 'Çeyrek final', qualifying: 'Eleme turu' })[round] ?? 'Ana tablo';
const empty = (title, description, action = '', label = '') => `<div class="empty-state">${icon('calendar')}<h4>${h(title)}</h4><p>${h(description)}</p>${action ? `<button data-action="${h(action)}">${h(label)}</button>` : ''}</div>`;
const crest = (mark, id, sport = 'football') => `<span class="crest ${h(sport === 'tennis' ? 'tennis' : id)}" aria-hidden="true">${h(mark)}</span>`;
const favoriteButton = (id, large = false) => `<button class="icon-button favorite-button${state.favoriteIds.has(id) ? ' selected' : ''}" data-action="favorite" data-id="${h(id)}" aria-label="${state.favoriteIds.has(id) ? 'Favorilerden çıkar' : 'Favorilere ekle'}" aria-pressed="${state.favoriteIds.has(id)}"${large ? ' style="width:42px;height:42px"' : ''}>${icon('star')}</button>`;

function header(overline, title, search = true) {
  return `<header class="app-header"><div><div class="overline">${h(overline)}</div><h2>${h(title)}</h2></div><div class="header-actions">${search ? `<button class="icon-button" data-action="scene" data-id="explore" aria-label="Takım veya sporcu ara">${icon('search')}</button>` : ''}<button class="avatar" data-action="scene" data-id="favorites" aria-label="Favorilerim">BA</button></div></header>`;
}

function backHeader(label, favoriteId = '') {
  return `<div class="back-header"><button class="icon-button" data-action="back" aria-label="Geri dön">${icon('back')}</button><span>${h(label)}</span>${favoriteId ? favoriteButton(favoriteId) : ''}</div>`;
}

function matchCard(event, detail = false) {
  const favorite = isFavorite(event, state.favoriteIds);
  return `<article class="match-card${favorite ? ' favorite' : ''}${event.featured ? ' featured' : ''}">
    <div class="league-line">${icon(sportIcon(event.sport))}${h(event.league)}${event.round ? ` · ${h(event.round)}` : ''}${event.live ? `<span class="match-live"><span class="live-dot"></span> CANLI</span>` : ''}${favorite ? icon('star', 'star-mark') : ''}</div>
    <button class="match-main" data-action="match" data-id="${h(event.id)}" aria-label="${h(event.home)} – ${h(event.away)}, ${event.live ? h(event.score) : h(event.time)}, detaylar">
      <span class="team">${crest(event.homeMark, event.homeId, event.sport)}<strong>${h(event.home)}</strong></span>
      <span class="score${event.live ? '' : ' scheduled'}">${h(event.live ? event.score : event.time)}<small>${h(event.live ? event.minute : (event.day === 14 ? 'Bu akşam' : event.day === 15 ? 'Yarın' : `${event.day} Eylül`))}</small></span>
      <span class="team">${crest(event.awayMark, event.awayId, event.sport)}<strong>${h(event.away)}</strong></span>
    </button>
    <div class="match-footer"><span class="channel">${icon('tv')}${h(event.channel)}</span>${event.live ? '<span class="freshness">Örnek skor</span>' : `<button data-action="remind" data-id="${h(event.id)}" aria-pressed="${state.reminders.has(event.id)}">${icon(state.reminders.has(event.id) ? 'check' : 'bell')}${state.reminders.has(event.id) ? 'Hatırlatıcı açık' : 'Hatırlat'}</button>`}</div>
  </article>${detail ? '<span class="update-note">Bu karttaki skor ve saat tasarım amaçlıdır; canlı veri alınmıyor.</span>' : ''}`;
}

function shortcut(event) {
  return `<button class="favorite-shortcut" data-action="match" data-id="${h(event.id)}"><span class="small-time">${h(event.live ? event.score.replaceAll(' ', '') : event.time)}</span><span><strong class="short-title">${h(event.home)} – ${h(event.away)}</strong><span class="short-meta">${h(event.live ? 'Canlı · 67. dakika' : event.day === 14 ? 'Bu akşam' : event.day === 15 ? 'Yarın' : `${event.day} Eylül`)} · ${h(event.league)}</span></span>${icon('arrow')}</button>`;
}

function home() {
  const filtered = filterEvents(events, state, state.favoriteIds);
  const favorites = filterEvents(events, { ...state, day: null, favoritesOnly: true }, state.favoriteIds);
  return `${header('SPORTPULSE', 'Maçın var.')}
    <div class="horizontal" aria-label="Branş seçimi">${[['all', 'Tümü', 'grid'], ['football', 'Futbol', 'football'], ['tennis', 'Tenis', 'tennis'], ['basketball', 'Basketbol', 'grid'], ['motorsport', 'Motor sporları', 'compass']].map(([id, name, symbol]) => `<button class="sport-chip${selected(state.sport === id)}" data-action="sport" data-id="${id}" aria-pressed="${state.sport === id}">${icon(symbol)}${name}</button>`).join('')}</div>
    <div class="filter-row"><button class="toggle-chip${selected(state.favoritesOnly)}" data-action="favorites-only" aria-pressed="${state.favoritesOnly}">${icon('star')}Favorilerim</button><button class="toggle-chip live${selected(state.liveOnly)}" data-action="live-only" aria-pressed="${state.liveOnly}"><span class="live-dot"></span>Canlı</button><button class="toggle-chip filter${selected(Boolean(state.league || state.channel))}" data-action="filters">${icon('sliders')}Filtreler${state.league || state.channel ? ` (${Number(Boolean(state.league)) + Number(Boolean(state.channel))})` : ''}</button></div>
    <div class="date-strip" aria-label="Örnek haftadan gün seç">${['Bugün', 'Yarın', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, i) => `<button class="date-item${selected(state.day === 14 + i)}" data-action="day" data-id="${14 + i}" aria-pressed="${state.day === 14 + i}"><span>${day}</span><b>${14 + i}</b><small></small></button>`).join('')}</div>
    ${!state.favoritesOnly && favorites.length ? `<section class="favorites-wrap"><div class="section-head">${icon('star')}<h3>Favorilerin</h3><span class="count">${favorites.length}</span><button data-action="collapse" aria-expanded="${!state.collapsed}">Bu hafta ${icon('arrow', state.collapsed ? '' : 'rotate-up')}</button></div>${state.collapsed ? '' : `${(state.showAllFavorites ? favorites : favorites.slice(0, 2)).map(shortcut).join('')}${favorites.length > 2 ? `<button class="text-button" data-action="all-favorites">${state.showAllFavorites ? 'Daha az göster' : `Diğer ${favorites.length - 2} maçı göster`}</button>` : ''}`}</section>` : ''}
    <div class="day-heading"><h3>${state.day === 14 ? 'Bugünün programı' : state.day === 15 ? 'Yarının programı' : `${state.day} Eylül`}</h3><span>${filtered.length} ETKİNLİK</span></div>
    ${filtered.length ? filtered.map((event) => matchCard(event)).join('') : empty('Bu seçimde maç yok', 'Başka bir gün seçebilir veya filtrelerini temizleyebilirsin.', 'reset-filters', 'Filtreleri temizle')}
    ${state.sport === 'all' || state.sport === 'tennis' ? `<div class="section-head"><h3>Turnuva radarı</h3><button data-action="scene" data-id="tournament">Fikstüre git ${icon('arrow')}</button></div><button class="tournament-hero mini-tournament" data-action="scene" data-id="tournament" style="width:100%;height:132px;text-align:left"><span class="court-art" aria-hidden="true"></span><span class="tournament-title"><span class="overline">TENİS · ANA TABLO</span><h2 style="font-size:23px">New York'ta son viraj.</h2><span class="subtle">US Open · Turnuvayı keşfet</span></span></button>` : ''}
    <p class="demo-indicator">14–20 Eylül · Örnek hafta<br>Gerçek maç programı veya canlı skor değildir.</p>`;
}

function playerPage() {
  const player = players.find((item) => item.id === state.player) ?? players[0];
  const matches = events.filter((event) => event.homeId === player.id || event.awayId === player.id);
  return `${backHeader('Sporcu profili', player.id)}
    <section class="player-hero"><span class="player-number" aria-hidden="true">${player.rank}</span><div class="overline">TENİS / ${h(player.tour)} TOUR</div>${player.photo ? `<img class="player-photo" src="${h(player.photo)}" alt="${h(player.name)}" referrerpolicy="no-referrer">` : `<div class="portrait-initials" aria-hidden="true">${h(player.initials)}</div>`}<h2>${h(player.name.split(' ')[0])}<br>${h(player.name.split(' ').slice(1).join(' '))}</h2><span class="country"><span class="country-code">${h(player.country)}</span> ${h(player.tour)} Tour</span></section>
    <div class="section-head"><h3>Sıradaki maç</h3><span style="margin-left:auto;font-size:9px;color:var(--mint)">TAKVİMİNDE</span></div>${matches.length ? matchCard(matches[0]) : empty('Program henüz belli değil', 'Kura ve saat açıklandığında bu alanda görünecek.')}
    <div class="section-head"><h3>Bir bakışta</h3><span style="margin-left:auto;font-size:8px;color:var(--muted)">ÖRNEK İSTATİSTİK</span></div>
    <div class="player-stat-row"><div class="player-stat"><b>#${player.rank}</b><small>${h(player.tour)} sıralaması</small></div><div class="player-stat"><b>${h(player.points)}</b><small>Sıralama puanı</small></div><div class="player-stat"><b>14 <span>EYL</span></b><small>Veri tarihi</small></div></div>
    <span class="update-note">Sıralama: örnek veri · Son güncelleme 14 Eylül<br>Gerçek sürümde eski veriyi bu tarihle açıkça göstereceğiz.</span>
    <div class="section-head"><h3>Turnuvası</h3></div><button class="result-row" data-action="scene" data-id="tournament"><span class="rank-badge">${icon('tennis')}</span><span><strong class="result-name">US Open</strong><small class="result-meta">New York · Sert kort · Ana tablo</small></span>${icon('arrow')}</button>
    <p class="demo-indicator">Profil bilgileri tasarım örneğidir.<br>Yıldız yalnızca bu önizlemedeki favorileri değiştirir.</p>`;
}

function tournament() {
  const matches = filterDraw(draw, { tour: state.drawTour, time: state.drawTime, round: state.drawRound });
  return `${backHeader('Turnuva detayı')}
    <section class="tournament-hero"><div class="court-art" aria-hidden="true"></div><div class="court-ball" aria-hidden="true"></div><div class="tournament-title"><span class="overline">NEW YORK · SERT KORT</span><h2>US Open</h2><span class="subtle">Ana tablo · Örnek turnuva görünümü</span></div></section>
    <div class="segmented" aria-label="Kura kategorisi">${[['ATP', 'Erkekler'], ['WTA', 'Kadınlar']].map(([id, title]) => `<button class="${selected(state.drawTour === id)}" data-action="draw-tour" data-id="${id}" aria-pressed="${state.drawTour === id}">${title}</button>`).join('')}</div>
    <div class="horizontal" aria-label="Maç zamanı">${[['today', 'Bugün'], ['upcoming', 'Yaklaşan'], ['finished', 'Sonuçlar'], ['all', 'Tümü']].map(([id, title]) => `<button class="sport-chip${selected(state.drawTime === id)}" data-action="draw-time" data-id="${id}" aria-pressed="${state.drawTime === id}">${title}</button>`).join('')}</div>
    <div class="draw-filter-row"><label><span class="sr-only">Tur seçimi</span><select id="draw-round">${[['all', 'Ana tablo · tüm turlar'], ['final', 'Final'], ['semi', 'Yarı final'], ['quarter', 'Çeyrek final'], ['qualifying', 'Eleme turları']].map(([id, title]) => `<option value="${id}"${state.drawRound === id ? ' selected' : ''}>${title}</option>`).join('')}</select></label><span>${matches.length} KARŞILAŞMA</span></div>
    ${matches.length ? matches.map((match) => `<article class="draw-match"><div class="draw-meta"><span>${roundName(match.round).toLocaleUpperCase('tr')}</span><span>${match.status === 'finished' ? 'MAÇ SONU' : `${match.day} Eyl · ${match.time}`}</span></div>${[['home', match.homeSets], ['away', match.awaySets]].map(([side, sets]) => `<div class="draw-player"><span class="country-code">${h(match[`${side}Country`])}</span>${match[`${side}Id`] ? `<button data-action="player" data-id="${h(match[`${side}Id`])}" class="player-link">${h(match[side])}</button>` : `<span>${h(match[side])}</span>`}<span class="seed">${match[`${side}Rank`]}</span>${sets ? `<span class="points${side === 'home' ? ' winner' : ''}">${h(sets)}</span>` : ''}</div>`).join('')}${events.some((event) => event.id === match.id) ? `<button class="draw-detail" data-action="match" data-id="${h(match.id)}">Maç detayları ${icon('arrow')}</button>` : ''}</article>`).join('') : empty(state.drawRound === 'final' ? 'Final eşleşmesi henüz yok' : 'Bu seçimde eşleşme yok', 'Boşluğu eleme maçlarıyla doldurmuyoruz. Başka bir tur veya zaman aralığı seçebilirsin.', 'draw-reset', 'Ana tabloyu göster')}
    <div class="feature-note">Elemeler yalnızca sen seçersen görünür. Oyuncu adına dokunarak profiline gidebilirsin.</div><p class="demo-indicator">Bu kura, tarihler ve sonuçlar temsili.</p>`;
}

function searchResults() {
  const result = searchCatalog(state.query);
  const renderResult = (item, type) => `<button class="result-row" data-action="${type}" data-id="${h(item.id)}">${type === 'player' ? `<span class="rank-badge">${h(item.initials)}</span>` : crest(item.initials, item.id)}<span><strong class="result-name">${h(item.name)}</strong><small class="result-meta">${h(type === 'player' ? `${item.tour} · ${item.country} · #${item.rank}` : `${item.sport === 'basketball' ? 'Basketbol' : 'Futbol'} · ${item.league}`)}</small></span>${icon('arrow')}</button>`;
  return `${result.teams.length ? `<div class="section-head"><h3>Takımlar</h3><span class="count">${result.teams.length}</span></div>${result.teams.map((item) => renderResult(item, 'team')).join('')}` : ''}${result.players.length ? `<div class="section-head"><h3>Sporcular</h3><span class="count">${result.players.length}</span></div>${result.players.map((item) => renderResult(item, 'player')).join('')}` : ''}${!result.teams.length && !result.players.length ? empty('Sonuç bulunamadı', 'Bu küçük prototip kataloğunda Beşiktaş, Sinner veya Rybakina aramayı dene.') : ''}`;
}

function explore() {
  return `${header('KEŞFET', 'Kimi izliyoruz?', false)}<p class="section-subtitle">Takım veya sporcu. Hepsi aynı aramada.</p><label class="search-field">${icon('search')}<span class="sr-only">Takım veya sporcu ara</span><input id="catalog-search" type="search" autocomplete="off" placeholder="Beşiktaş, Sinner, Rybakina…" value="${h(state.query)}"></label><div id="search-results">${searchResults()}</div><p class="demo-indicator">Arama bu prototipteki örnek katalogda yapılır.</p>`;
}

function teamPage() {
  const team = teams.find((item) => item.id === state.team) ?? teams[0];
  const matches = events.filter((event) => event.homeId === team.id || event.awayId === team.id);
  return `${backHeader('Takım profili', team.id)}<section class="team-profile-head">${crest(team.initials, team.id)}<div><div class="overline">${h(team.league)}</div><h2>${h(team.name)}</h2><span class="subtle">${team.sport === 'basketball' ? 'Basketbol' : 'Futbol'} · Türkiye</span></div></section><div class="section-head"><h3>Maç programı</h3><span class="count">${matches.length}</span></div>${matches.map((event) => matchCard(event)).join('') || empty('Örnek maç bulunmuyor', 'Bu prototipte takımın örnek fikstürü henüz yok.')}<p class="demo-indicator">Takım sayfası · Tasarım örneği</p>`;
}

function favoritesPage() {
  const list = [...teams, ...players].filter((item) => state.favoriteIds.has(item.id));
  return `${header('SANA ÖZEL', 'Favorilerin.', false)}<p class="section-subtitle">Takip, ne göreceğini belirler.<br>Yıldız, hangisinin öne çıkacağını.</p>${list.length ? list.map((item) => `<div class="favorite-list-row"><button class="result-row" data-action="${item.tour ? 'player' : 'team'}" data-id="${h(item.id)}">${item.tour ? `<span class="rank-badge">${h(item.initials)}</span>` : crest(item.initials, item.id)}<span><strong class="result-name">${h(item.name)}</strong><small class="result-meta">${h(item.tour ? `Tenis · ${item.tour} · #${item.rank}` : item.league)}</small></span>${icon('arrow')}</button>${favoriteButton(item.id)}</div>`).join('') : empty('Henüz favorin yok', 'Keşfet’ten takım veya sporcu seçip yıldızlayabilirsin.', 'explore', 'Keşfet') }<button class="primary-button" data-action="scene" data-id="explore">Takım veya sporcu ekle</button><p class="demo-indicator">Değişiklikler gerçek hesabına kaydedilmez.</p>`;
}

function matchPage() {
  const event = events.find((item) => item.id === state.match) ?? events[0];
  return `${backHeader('Maç merkezi')}<div class="overline">${h(event.day)} EYLÜL · ÖRNEK KARŞILAŞMA</div><div class="detail-summary">${matchCard(event, true)}</div><div class="segmented"><button class="active">Genel bakış</button><button data-action="demo-tab">İstatistikler</button><button data-action="demo-tab">Kadrolar</button></div><section class="detail-info"><h4>Nereden izlenir?</h4><p>${h(event.channel)}</p><div class="info-line"><span>Başlangıç</span><strong>${event.day} Eyl · ${event.time}</strong></div><div class="info-line"><span>${event.sport === 'tennis' ? 'Kort' : 'Salon / stadyum'}</span><strong>${h(event.venue)}</strong></div></section><div class="section-head"><h3>${event.sport === 'tennis' ? 'Sporcular' : 'Takımlar'}</h3></div>${[['home', event.homeId], ['away', event.awayId]].map(([side, id]) => (event.sport === 'tennis' ? players : teams).some((item) => item.id === id) ? `<button class="result-row" data-action="${event.sport === 'tennis' ? 'player' : 'team'}" data-id="${h(id)}">${crest(event[`${side}Mark`], id, event.sport)}<span class="result-name">${h(event[side])}</span>${icon('arrow')}</button>` : '').join('')}<button class="primary-button" data-action="calendar">Takvimime ekle ${icon('calendar')}</button><div class="feature-note">Bu önizlemede takvim kaydı veya bildirim oluşturulmaz. Gerçek canlı skorda son güncelleme saati de gösterilecek.</div>`;
}

function render(resetScroll = false) {
  const scenes = { home, player: playerPage, tournament, explore, team: teamPage, favorites: favoritesPage, match: matchPage };
  app.innerHTML = (scenes[state.scene] ?? home)();
  if (resetScroll) { scroll.scrollTop = 0; app.classList.remove('route-enter'); void app.offsetWidth; app.classList.add('route-enter'); }
  document.querySelectorAll('[data-scene]').forEach((button) => {
    const active = button.dataset.scene === state.scene;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  app.querySelectorAll('.player-photo').forEach((img) => { img.addEventListener('error', () => { img.hidden = true; }, { once: true }); });
}

function go(scene) {
  if (state.scene !== scene) history.push(state.scene);
  state.scene = scene;
  closeSheet();
  render(true);
  if (scene === 'explore') app.querySelector('#catalog-search')?.focus({ preventScroll: true });
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2800);
}

function showFilters(initial = true) {
  if (initial) sheetOpener = document.activeElement;
  app.inert = true;
  nav.inert = true;
  sheetRoot.innerHTML = `<div class="filter-sheet-backdrop" data-action="close-sheet"><section class="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div class="sheet-handle"></div><div class="sheet-heading"><h3 id="filter-title">İnce ayar.</h3><button data-action="close-sheet" aria-label="Filtreleri kapat">${icon('close')}</button></div><span class="sheet-label">LİG / TURNUVA</span><div class="filter-options">${['', ...new Set(events.map((event) => event.league))].map((league) => `<button class="option${selected(state.league === league)}" data-action="league" data-id="${h(league)}" aria-pressed="${state.league === league}">${h(league || 'Tümü')}</button>`).join('')}</div><span class="sheet-label">YAYIN KANALI</span><div class="filter-options">${['', ...new Set(events.map((event) => event.channel))].map((channel) => `<button class="option${selected(state.channel === channel)}" data-action="channel" data-id="${h(channel)}" aria-pressed="${state.channel === channel}">${h(channel || 'Tümü')}</button>`).join('')}</div><button class="primary-button" data-action="apply-filters">${filterEvents(events, state, state.favoriteIds).length} etkinliği göster</button><button class="secondary-button" data-action="reset-sheet">Lig ve kanal seçimini temizle</button><p class="demo-indicator">Favori ve branş seçimin korunur.</p></section></div>`;
  if (initial) sheetRoot.querySelector('.filter-sheet button')?.focus();
}

function closeSheet() {
  sheetRoot.innerHTML = '';
  app.inert = false;
  nav.inert = false;
  if (sheetOpener?.isConnected) sheetOpener.focus({ preventScroll: true });
  sheetOpener = null;
}

document.addEventListener('click', (event) => {
  const scene = event.target.closest('[data-scene]');
  if (scene) { go(scene.dataset.scene); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'close-sheet' && button.classList.contains('filter-sheet-backdrop') && event.target !== button) return;
  if (action === 'scene') return go(id);
  if (action === 'explore') return go('explore');
  if (action === 'back') { state.scene = history.pop() ?? 'home'; render(true); return; }
  if (action === 'player') { state.player = id; return go('player'); }
  if (action === 'team') { state.team = id; return go('team'); }
  if (action === 'match') { if (state.scene === 'match') return; state.match = id; return go('match'); }
  if (action === 'sport') state.sport = id;
  if (action === 'day') state.day = Number(id);
  if (action === 'favorites-only') state.favoritesOnly = !state.favoritesOnly;
  if (action === 'live-only') state.liveOnly = !state.liveOnly;
  if (action === 'all-favorites') state.showAllFavorites = !state.showAllFavorites;
  if (action === 'collapse') { state.collapsed = !state.collapsed; try { localStorage.setItem('sportpulse-lab.favoritesCollapsed', state.collapsed ? '1' : '0'); } catch {} }
  if (action === 'favorite') { const active = state.favoriteIds.has(id); if (active) state.favoriteIds.delete(id); else state.favoriteIds.add(id); toast(active ? 'Önizleme favorilerinden çıkarıldı.' : 'Önizleme favorilerine eklendi.'); }
  if (action === 'remind') { if (state.reminders.has(id)) state.reminders.delete(id); else state.reminders.add(id); toast('Yalnızca görsel deneme; cihazında bildirim oluşturulmadı.'); }
  if (action === 'filters') return showFilters();
  if (action === 'close-sheet') return closeSheet();
  if (action === 'league' || action === 'channel') { state[action] = id; showFilters(false); sheetRoot.querySelector(`[data-action="${action}"][aria-pressed="true"]`)?.focus(); return; }
  if (action === 'reset-sheet') { state.league = ''; state.channel = ''; return showFilters(); }
  if (action === 'apply-filters') closeSheet();
  if (action === 'reset-filters') { state.sport = 'all'; state.favoritesOnly = false; state.liveOnly = false; state.league = ''; state.channel = ''; }
  if (action === 'draw-tour') state.drawTour = id;
  if (action === 'draw-time') state.drawTime = id;
  if (action === 'draw-reset') { state.drawRound = 'all'; state.drawTime = 'all'; }
  if (action === 'calendar') return toast('Tasarım önizlemesi: takvimine kayıt eklenmedi.');
  if (action === 'demo-tab') return toast('Bu prototip genel bakış akışını gösteriyor; istatistik verisi bağlı değil.');
  render();
});

document.addEventListener('input', (event) => {
  if (event.target.id !== 'catalog-search') return;
  state.query = event.target.value;
  document.querySelector('#search-results').innerHTML = searchResults();
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'draw-round') { state.drawRound = event.target.value; render(); document.querySelector('#draw-round')?.focus({ preventScroll: true }); }
});

document.addEventListener('keydown', (event) => {
  if (!sheetRoot.children.length) return;
  if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
  if (event.key === 'Tab') {
    const focusables = [...sheetRoot.querySelectorAll('button, select, input')];
    const first = focusables[0]; const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});

document.querySelector('#effects-toggle').addEventListener('click', (event) => {
  state.effects = !state.effects;
  document.body.classList.toggle('no-effects', !state.effects);
  event.currentTarget.setAttribute('aria-pressed', String(state.effects));
  event.currentTarget.textContent = state.effects ? 'Efektler açık' : 'Efektler kapalı';
});
document.querySelector('#density-toggle').addEventListener('click', (event) => {
  state.compact = !state.compact;
  document.body.classList.toggle('compact', state.compact);
  event.currentTarget.setAttribute('aria-pressed', String(state.compact));
  event.currentTarget.textContent = state.compact ? 'Rahat görünüme dön' : 'Daha kompakt dene';
});
render();
