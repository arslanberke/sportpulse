#!/usr/bin/env node

/**
 * Aydinlatma metninin barindirilabilir HTML surumunu uretir.
 *
 * Neden gerekli: App Store Connect uygulama kaydinda gizlilik politikasi icin
 * bir URL zorunlu; uygulama icindeki ekran bu alanin yerine gecmiyor.
 *
 * Neden uretiliyor: metni elle ikinci kez yazmak, iki surumun zamanla
 * birbirinden ayrilmasi demek. Kaynak tek: src/features/legal/privacy-notice.ts.
 * Ciktinin git'te tutulmasi bilincli -- GitHub Pages dosyayi depodan yayinlar.
 *
 * Kullanim: npm run legal:html
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Metin dosyasi yalnizca `import type` kullaniyor, dolayisiyla Node'un tip
// soyma davranisiyla dogrudan calisir; yol takma adi cozmeye gerek kalmaz.
const { privacyNoticeFor } = await import(
  join(root, 'src/features/legal/privacy-notice.ts')
);

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Gorunur e-posta adreslerini tiklanabilir yapar. */
function linkEmails(text) {
  return text.replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
}

function paragraphs(body) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => `        <p>${linkEmails(escapeHtml(line))}</p>`)
    .join('\n');
}

function renderNotice(notice, headingLevel = 'h2') {
  const sections = notice.sections
    .map(
      (section) => `      <section>
        <${headingLevel}>${escapeHtml(section.heading)}</${headingLevel}>
${paragraphs(section.body)}
      </section>`,
    )
    .join('\n');

  return `      <p class="intro">${escapeHtml(notice.intro)}</p>
      <p class="updated">${escapeHtml(notice.updated)}</p>
${sections}`;
}

const tr = privacyNoticeFor('tr');
const en = privacyNoticeFor('en');

const html = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>sportpulse — Aydınlatma Metni / Privacy Notice</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0 auto;
        max-width: 44rem;
        padding: 2rem 1.25rem 4rem;
        font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      h2 { font-size: 1.05rem; margin: 2rem 0 0.5rem; }
      p { margin: 0 0 0.75rem; }
      .intro { font-size: 1rem; }
      .updated { color: #6b7280; font-size: 0.85rem; }
      .lang { margin-top: 3.5rem; border-top: 1px solid #d1d5db; padding-top: 2rem; }
      footer { margin-top: 3rem; color: #6b7280; font-size: 0.85rem; }
    </style>
  </head>
  <body>
    <h1>sportpulse</h1>
    <main>
${renderNotice(tr)}
      <div class="lang">
        <h1>English</h1>
${renderNotice(en)}
      </div>
    </main>
    <footer>
      <p>sportpulse</p>
    </footer>
  </body>
</html>
`;

const outDir = join(root, 'docs');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'privacy.html'), html, 'utf8');
console.log('docs/privacy.html yazildi');
