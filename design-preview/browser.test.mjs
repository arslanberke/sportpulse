import assert from 'node:assert/strict';

const targets = await (await fetch('http://127.0.0.1:9225/json/list')).json();
const target = targets.find((item) => item.type === 'page');
assert.ok(target, 'isolated Chrome page must exist');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = (message) => {
  const packet = JSON.parse(message.data);
  if (packet.method === 'Runtime.exceptionThrown') errors.push(packet.params.exceptionDetails.text);
  const handler = pending.get(packet.id);
  if (handler) {
    clearTimeout(handler.timeout);
    pending.delete(packet.id);
    if (packet.error) handler.reject(new Error(packet.error.message)); else handler.resolve(packet.result);
  }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const count = (selector) => evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await evaluate(`new Promise((resolve, reject) => { let n = 0; const timer = setInterval(() => { if(document.querySelector('.match-card')) {clearInterval(timer);resolve(true);} else if(++n > 100){clearInterval(timer);reject(new Error('App did not render'));} }, 50); })`);
  assert.equal(await count('.favorite-shortcut'), 2);
  assert.equal(await count('.match-card'), 3);
  await click('[data-action="collapse"]');
  assert.equal(await count('.favorite-shortcut'), 0);
  assert.equal(await count('.match-card'), 3);
  await click('[data-action="collapse"]');
  await click('[data-action="all-favorites"]');
  assert.equal(await count('.favorite-shortcut'), 4);
  await click('[data-action="all-favorites"]');

  await click('[data-action="sport"][data-id="football"]');
  await click('[data-action="favorites-only"]');
  await click('[data-action="live-only"]');
  assert.equal(await count('.match-card'), 1);
  assert.equal(await evaluate(`document.querySelector('[data-action="sport"][data-id="football"]').getAttribute('aria-pressed')`), 'true');
  await click('[data-action="sport"][data-id="tennis"]');
  assert.equal(await count('.match-card'), 0);
  assert.equal(await evaluate(`document.querySelector('[data-action="favorites-only"]').getAttribute('aria-pressed')`), 'true');
  await click('[data-action="reset-filters"]');

  await click('[data-action="filters"]');
  assert.equal(await count('[role="dialog"]'), 1);
  await click('[data-action="channel"][data-id="Eurosport 1"]');
  await click('[data-action="apply-filters"]');
  assert.equal(await count('.match-card'), 1);
  await click('[data-action="filters"]');
  await click('[data-action="reset-sheet"]');
  await click('[data-action="apply-filters"]');
  assert.equal(await count('.match-card'), 3);

  await click('[data-action="scene"][data-id="explore"]');
  await evaluate(`const input=document.querySelector('#catalog-search');input.value='sinner';input.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await count('[data-action="player"]'), 1);
  await click('[data-action="player"][data-id="sinner"]');
  assert.equal(await count('.player-hero'), 1);
  await click('[data-action="favorite"][data-id="sinner"]');
  assert.equal(await evaluate(`document.querySelector('[data-action="favorite"]').getAttribute('aria-pressed')`), 'false');
  await click('[data-action="favorite"][data-id="sinner"]');

  await click('.scene[data-scene="tournament"]');
  assert.equal(await count('.draw-match'), 2);
  await evaluate(`const select=document.querySelector('#draw-round');select.value='final';select.dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await count('.draw-match'), 0);
  assert.ok((await evaluate(`document.querySelector('.empty-state').textContent`)).includes('henüz yok'));
  await click('[data-action="draw-reset"]');
  await click('[data-action="draw-tour"][data-id="WTA"]');
  await click('[data-action="draw-time"][data-id="finished"]');
  assert.equal(await count('.draw-match'), 0);
  await evaluate(`{ const select=document.querySelector('#draw-round');select.value='qualifying';select.dispatchEvent(new Event('change',{bubbles:true})); }`);
  assert.equal(await count('.draw-match'), 1);

  await click('.scene[data-scene="home"]');
  for (const width of [375, 414, 768, 1400]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false });
    const metrics = await evaluate(`({ page: document.documentElement.scrollWidth, viewport: innerWidth, app: document.querySelector('#app').scrollWidth, appWidth: document.querySelector('#app').clientWidth })`);
    assert.ok(metrics.page <= metrics.viewport, `Page overflow at ${width}: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.app <= metrics.appWidth + 1, `App overflow at ${width}: ${JSON.stringify(metrics)}`);
  }
  await click('#effects-toggle');
  assert.equal(await evaluate(`document.body.classList.contains('no-effects')`), true);
  await click('#effects-toggle');
  await click('#density-toggle');
  assert.equal(await evaluate(`document.body.classList.contains('compact')`), true);
  await click('#density-toggle');
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: favorites, independent filters, sheet, search, profile, draw, effects, responsive widths.');
} finally {
  socket.close();
}
