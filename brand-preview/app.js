const concepts = [
  {
    id: 'link', name: 'Bağ', mood: 'Yumuşak / Birlikte / Zamansız', tag: 'BİRİNCİ ÖNERİM',
    description: 'İki harf, tek bir aile. Yuvarlatılmış şeritler S ve P’yi sıkıştırmadan bir arada tutuyor. Sporun rekabetinden çok, sevdiğin takımla kurduğun bağa odaklanıyor.',
    note: 'En dengeli seçenek. Küçük ikonda okunaklı; futbol, tenis veya motor sporlarından birine gereğinden fazla benzemiyor.',
    motion: 'S ve P iki yandan yaklaşır, yerlerine oturur. Kısa ve sakin bir buluşma; sonsuz dönen bir animasyon değil.',
    art: '<g stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path class="logo-primary stroke part-s" d="M65 30H43C19 30 19 59 43 59H52C78 59 78 90 52 90H27"/><path class="logo-secondary stroke part-p" d="M90 90V30H113C142 30 142 62 113 62H90"/></g>',
  },
  {
    id: 'sprint', name: 'Sprint', mood: 'Keskin / Hızlı / Sportif', tag: 'MAÇ GÜNÜ ENERJİSİ',
    description: 'İleri eğimli kesimler ve sıkı bir ritim. S bir yarış çizgisi gibi akarken P sağlam bir omurga kuruyor. Daha belirgin, daha atletik bir SportPulse.',
    note: 'Beşli içindeki en sportif yön. İkon zemini düz tutulmalı; harflerin hızı tek başına yeterli, ek parıltıya gerek yok.',
    motion: 'Monogram soldan kısa bir kayışla gelir ve durur. Ani flaş, zıplama veya sürekli hız efekti yok.',
    art: '<g transform="translate(15 0) skewX(-11)"><path class="logo-primary" d="M36 27H76V41H37V52H65L76 63V82L65 93H16V79H61V65H32L23 56V40Z"/><path class="logo-secondary" fill-rule="evenodd" d="M87 27H123L137 40V59L123 72H101V93H87ZM101 41V58H118L123 54V45L118 41Z"/></g>',
  },
  {
    id: 'crest', name: 'Tribün', mood: 'Aidiyet / Güç / Karakter', tag: 'BİR KULÜP GİBİ',
    description: 'SP, ince bir spor armasının içinde. Üstteki açık kesim ve aşağı uzanan uç, klasik kalkanı hafifletiyor. Takımını yanında taşıma hissi en güçlü olan alternatif.',
    note: 'Rozet hissini sevenler için. 24 pikselde çerçeve daha baskın hale gelir; büyük ikon ve açılış ekranında daha iyi çalışır.',
    motion: 'Armanın dış hattı çizilir, SP yavaşça görünür. Taraftar rozeti gibi tamamlanan tek bir hareket.',
    art: '<path class="logo-outline stroke" stroke-width="4" stroke-linejoin="round" d="M58 13H117V64Q116 91 80 109Q44 91 43 64V13H49"/><g class="letters" stroke-width="8" stroke-linecap="square" stroke-linejoin="round"><path class="logo-primary stroke" d="M73 39H60V53H71V69H56"/><path class="logo-secondary stroke" d="M85 76V39H98Q109 39 109 50Q109 60 98 60H85"/></g><path class="logo-primary" d="M73 85H87L80 91Z"/>',
  },
  {
    id: 'pulse', name: 'Ritim', mood: 'Akış / Nabız / Bağlantı', tag: 'İSMİN GÖRSEL KARŞILIĞI',
    description: 'SportPulse’un “pulse” tarafı öne çıkıyor. S’nin altından geçen ritim çizgisi, P’nin dikey yapısıyla buluşuyor. Maçı beklerken hissedilen o küçük heyecan.',
    note: 'Yükleme durumunda en anlatımlı seçenek. Nabız çizgisi dekoratiftir; canlı veri, kalp ölçümü veya gerçek ilerleme göstergesi değildir.',
    motion: 'Ritim çizgisi bir kez soldan sağa çizilir. Harfler sabit kalır; logo okunurluğu hareket uğruna kaybolmaz.',
    art: '<g stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path class="logo-primary stroke" d="M66 28H40C17 28 17 52 40 52H49C73 52 73 76 49 76H31"/><path class="logo-secondary stroke" d="M91 88V28H115C142 28 142 57 115 57H91"/></g><path class="logo-primary stroke pulse-line" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 94H44L51 86L59 106L70 80L78 94H143"/>',
  },
  {
    id: 'focus', name: 'Odak', mood: 'Sade / Hassas / Editoryal', tag: 'SESSİZ ÖZGÜVEN',
    description: 'İnce bir yörünge, net bir SP. Sade çizgiler ve geniş boşluklar uygulamaya spor dergisi gibi özenli bir karakter veriyor. En az hareketle en çok tanınırlık.',
    note: 'Sakin arayüzle en uyumlu yön. Koyu lacivert ikon, yeşil monogram. Küçük boyutta dış halkayı sadeleştirmek düşünülebilir.',
    motion: 'Dış yörünge kısa bir dönüşle yerini bulur. SP yerinden oynamaz; istenirse tamamen statik kullanılabilir.',
    art: '<g class="focus-ring"><path class="logo-primary stroke" stroke-width="3" stroke-linecap="round" d="M127 31A53 53 0 1 1 102 12"/><circle class="logo-primary" cx="115" cy="18" r="4"/></g><g stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path class="logo-secondary stroke" d="M72 39H56C41 39 41 57 56 57H62C78 57 78 77 62 77H47"/><path class="logo-primary stroke" d="M88 80V39H101C120 39 120 60 101 60H88"/></g>',
  },
];

const $ = selector => document.querySelector(selector);
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
let saved = null;
try { saved = localStorage.getItem('sportpulse.brand-choice'); } catch {}
let selected = concepts.find(item => item.id === saved) ?? concepts[0];
let mode = 'splash';
let light = false;
let motion = !media.matches;
let animationTimer;
const logo = (concept, extra = '') => `<svg class="mark ${extra}" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${concept.art}</svg>`;
const icon = (concept, size, alternate = false) => `<div class="app-icon${alternate ? ' alternate' : ''}" data-brand="${concept.id}" style="--size:${size}px">${logo(concept)}</div>`;

$('#concept-grid').innerHTML = concepts.map((concept, index) => `<button class="concept-card" data-concept="${concept.id}" aria-pressed="false" aria-label="${index + 1}. ${concept.name} logosunu incele"><div class="concept-visual"><span class="concept-number">0${index + 1}</span>${logo(concept)}</div><div class="concept-copy"><h3>${concept.name}</h3><p>${concept.mood}</p><span>${concept.tag}</span></div></button>`).join('');

function stopMotion() {
  clearTimeout(animationTimer);
  $('#phone').classList.remove('is-playing');
}

function play() {
  stopMotion();
  if (!motion || media.matches || mode === 'icon') return;
  void $('#phone').offsetWidth;
  $('#phone').classList.add('is-playing');
  animationTimer = setTimeout(stopMotion, 3500);
}

function renderPhone() {
  stopMotion();
  const phone = $('#phone');
  phone.dataset.mode = mode;
  phone.className = `phone motion-${selected.id}${motion && !media.matches ? '' : ' motion-off'}`;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  if (mode === 'splash') {
    $('#phone-content').innerHTML = `<div class="splash-screen"><div class="splash-mark">${logo(selected)}</div><div class="splash-title">sportpulse</div><p class="splash-tagline">Sevdiğin spor. Senin ritmin.</p><div class="motion-rail" aria-hidden="true"><span></span></div><span class="splash-footer">HER MAÇIN BİR HİSSİ VAR.</span></div>`;
  } else if (mode === 'loading') {
    $('#phone-content').innerHTML = `<div class="loading-screen"><div class="loading-header">SPORTPULSE</div><h4>Maçın var.</h4>${Array.from({ length: 2 }, () => '<div class="skeleton" aria-hidden="true"><div class="skeleton-top"></div><div class="skeleton-row"><div class="skeleton-disc"></div><div class="skeleton-score"></div><div class="skeleton-disc"></div></div><div class="skeleton-bottom"></div></div>').join('')}<div class="loader-status"><div class="loader-mark">${logo(selected)}</div><span>Programın hazırlanıyor</span></div><p class="loading-footnote">Görsel yükleme örneği · Veri alınmıyor</p></div>`;
  } else {
    $('#phone-content').innerHTML = `<div class="icon-screen"><h4>Pazar</h4><p class="icon-date">Senin maç günün.</p><div class="home-apps"><div><div class="neutral-icon">20</div><small>Takvim</small></div><div class="selected-icon">${icon(selected, 49, ['focus', 'sprint'].includes(selected.id))}<small>SportPulse</small></div><div><div class="neutral-icon">Aa</div><small>Notlar</small></div><div><div class="neutral-icon">＋</div><small>Sağlık</small></div><div><div class="neutral-icon">♫</div><small>Müzik</small></div><div><div class="neutral-icon">◷</div><small>Saat</small></div></div><p class="home-app-note">Örnek ana ekran yerleşimi.<br>İkonlar karşılaştırma içindir.</p></div>`;
  }
  $('#play').disabled = !motion || media.matches || mode === 'icon';
  $('#play').style.opacity = $('#play').disabled ? '.4' : '1';
  $('#motion-toggle').disabled = media.matches;
  $('#motion-toggle').setAttribute('aria-pressed', String(motion && !media.matches));
  $('#motion-toggle').textContent = media.matches ? 'Azaltılmış hareket' : motion ? 'Hareket açık' : 'Hareket kapalı';
  $('#motion-description').textContent = mode === 'icon' ? 'Dikkat dağıtan bir zeminde bile küçük ikonu bulabiliyor musun?' : mode === 'loading' ? 'İçerik yerine iskelet kartlar; küçük SP imzasıyla sakin bir bekleme hali. Yüzde veya sahte geri sayım yok.' : selected.motion;
  play();
}

function render() {
  document.body.dataset.selectedBrand = selected.id;
  const number = `0${concepts.indexOf(selected) + 1}`;
  $('#hero-number').textContent = `${number}—05`;
  $('#hero-name').textContent = selected.name;
  $('#hero-logo').innerHTML = logo(selected);
  $('#selection-summary').textContent = `${number} · ${selected.name}`;
  $('#concept-name').textContent = `${number} / ${selected.name}`;
  $('#concept-tagline').textContent = selected.mood;
  $('#concept-description').textContent = selected.description;
  $('#concept-note').textContent = selected.note;
  $('#identity-logo').innerHTML = logo(selected);
  $('#size-samples').innerHTML = [80, 48, 24].map(size => `<div class="size-sample">${icon(selected, size, ['focus', 'sprint'].includes(selected.id))}<small>${size} px</small></div>`).join('') + `<div class="size-sample">${icon(selected, 48, !['focus', 'sprint'].includes(selected.id))}<small>Alternatif</small></div>`;
  document.querySelectorAll('[data-concept]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.concept === selected.id)));
  $('#save-choice').textContent = saved === selected.id ? 'İşaretlendi' : 'Bu yönü işaretle';
  $('#save-choice').setAttribute('aria-pressed', String(saved === selected.id));
  $('#saved-message').textContent = saved ? `${concepts.find(item => item.id === saved)?.name ?? ''} bu tarayıcıda işaretli. Uygulamaya henüz uygulanmadı.` : 'Seçim yalnızca bu tarayıcıda tutulur; uygulamayı değiştirmez.';
  renderPhone();
}

$('#concept-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-concept]');
  if (!button) return;
  selected = concepts.find(concept => concept.id === button.dataset.concept);
  render();
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; renderPhone(); }));
$('#theme-toggle').addEventListener('click', () => {
  light = !light;
  $('#identity-stage').classList.toggle('light', light);
  $('#theme-toggle').setAttribute('aria-pressed', String(light));
  $('#theme-toggle').textContent = light ? 'Koyu zeminde gör' : 'Açık zeminde gör';
});
$('#motion-toggle').addEventListener('click', () => { motion = !motion; renderPhone(); });
$('#play').addEventListener('click', play);
media.addEventListener('change', () => { motion = !media.matches; renderPhone(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
$('#save-choice').addEventListener('click', () => {
  try {
    localStorage.setItem('sportpulse.brand-choice', selected.id);
    saved = selected.id;
    render();
  } catch { $('#saved-message').textContent = 'Tarayıcı depolamaya izin vermedi. Seçimini kaydetmedim; alternatif numarasını söyleyebilirsin.'; }
});
$('#download-logo').addEventListener('click', () => {
  const colors = light ? ['#087653', '#09192c'] : selected.id === 'sprint' ? ['#4de3b5', '#a1edce'] : ['#10b981', '#b5f3d7'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><title>SportPulse — ${selected.name} taslak logo</title><style>.logo-primary{color:${colors[0]};fill:currentColor}.logo-secondary{color:${colors[1]};fill:currentColor}.stroke{fill:none;stroke:currentColor}.logo-outline{color:${colors[0]};opacity:.6}</style>${selected.art}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `sportpulse-${selected.id}-${light ? 'light' : 'dark'}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
