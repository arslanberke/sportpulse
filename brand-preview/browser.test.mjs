import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const targets = await (await fetch('http://127.0.0.1:9227/json/list')).json();
const target = targets.find(item => item.type === 'page');
assert.ok(target, 'Start isolated Chrome on port 9227');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
const pending = new Map();
const errors = [];
let sequence = 0;
socket.onmessage = message => {
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
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const waitFor = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true)}else if(++n>100){clearInterval(timer);reject(new Error('UI timeout'))}},50)})`);
async function shot(path) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path, Buffer.from(result.data, 'base64'));
}
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4174' });
  await waitFor(`document.querySelectorAll('[data-concept]').length===5`);
  await evaluate(`localStorage.removeItem('sportpulse.brand-choice')`);
  const shapes = new Set();
  for (const id of ['link', 'sprint', 'crest', 'pulse', 'focus']) {
    await click(`[data-concept="${id}"]`);
    assert.equal(await evaluate(`document.querySelector('[data-concept="${id}"]').getAttribute('aria-pressed')`), 'true');
    assert.equal(await evaluate(`document.querySelectorAll('[data-concept][aria-pressed="true"]').length`), 1);
    shapes.add(await evaluate(`document.querySelector('#identity-logo svg').innerHTML`));
    assert.equal(await evaluate(`document.querySelectorAll('.size-sample').length`), 4);
    if (id === 'sprint') {
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.size-sample .app-icon')).backgroundColor`), 'rgb(11, 34, 48)');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.size-sample .logo-primary')).color`), 'rgb(77, 227, 181)');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.size-sample .logo-secondary')).color`), 'rgb(161, 237, 206)');
    }
    await click('[data-mode="loading"]');
    assert.equal(await evaluate(`document.querySelectorAll('.skeleton').length`), 2);
    assert.equal(await evaluate(`document.querySelector('#phone-content').textContent.includes('Veri alınmıyor')`), true);
    await click('[data-mode="icon"]');
    assert.equal(await evaluate(`document.querySelectorAll('.selected-icon svg').length`), 1);
    assert.equal(await evaluate(`document.querySelector('#play').disabled`), true);
    await click('[data-mode="splash"]');
  }
  assert.equal(shapes.size, 5);
  await click('#theme-toggle');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#identity-logo .logo-primary')).color`), 'rgb(8, 118, 83)');
  await evaluate(`window.testCreateObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.testLogoBlob=blob;return window.testCreateObjectURL(blob)};window.testAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.testDownloadName=this.download}else window.testAnchorClick.call(this)}`);
  await click('#download-logo');
  const svg = await evaluate(`window.testLogoBlob.text()`);
  assert.match(svg, /<svg/);
  assert.match(svg, /#09192c/);
  assert.match(svg, /#087653/);
  assert.match(await evaluate('window.testDownloadName'), /sportpulse-focus-light\.svg/);
  await evaluate(`URL.createObjectURL=window.testCreateObjectURL;HTMLAnchorElement.prototype.click=window.testAnchorClick`);
  await click('#theme-toggle');
  await click('#motion-toggle');
  assert.equal(await evaluate(`document.querySelector('#phone').classList.contains('is-playing')`), false);
  assert.equal(await evaluate(`document.querySelector('#play').disabled`), true);
  await click('#motion-toggle');
  await click('#play');
  assert.equal(await evaluate(`document.querySelector('#phone').classList.contains('is-playing')`), true);
  await click('#save-choice');
  assert.equal(await evaluate(`localStorage.getItem('sportpulse.brand-choice')`), 'focus');
  await send('Page.reload');
  await waitFor(`document.querySelector('[data-concept="focus"]')?.getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('[data-concept="sprint"]').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 36, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate(`document.querySelector('[data-concept="sprint"]').getAttribute('aria-pressed')`), 'true');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await waitFor(`document.querySelector('#motion-toggle').disabled`);
  assert.equal(await evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`), 0);
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `page overflows at ${width}px`);
    assert.equal(await evaluate(`(()=>{const phone=document.querySelector('#phone').getBoundingClientRect();return phone.left>=0&&phone.right<=innerWidth})()`), true, `phone overflows at ${width}px`);
  }
  await click('[data-concept="link"]');
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);
  await shot('/tmp/sportpulse-brand-desktop.png');
  await evaluate(`document.querySelector('#lab').scrollIntoView({behavior:'instant'})`);
  await shot('/tmp/sportpulse-brand-lab.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);
  await shot('/tmp/sportpulse-brand-mobile.png');
  assert.deepEqual(errors, []);
  console.log('Brand preview checks passed: five distinct SVG marks, three phone modes, light/dark palette, SVG export, saved preference, keyboard selection, reduced motion and 320–1440px layouts.');
} finally { socket.close(); }
