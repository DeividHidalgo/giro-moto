const fs = require('fs');
const path = require('path');
const webcrypto = require('node:crypto').webcrypto;

const els = {};
function el(id) {
  if (!els[id]) {
    els[id] = {
      id, innerHTML: '', textContent: '', hidden: false, value: '', type: '', dataset: {}, _l: {}, _fd: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener(ev, f) { this._l[ev] = f; },
      setAttribute() {}, removeAttribute() {}, focus() {}, select() {},
      checkValidity() { return true; }, reportValidity() {},
      querySelector() { return null; },
    };
  }
  return els[id];
}
el('#sheet').hidden = true; el('#toast').hidden = true; el('#shell').hidden = true; el('#lhint').hidden = true; el('#modo').hidden = true;

const handlers = {};
global.document = {
  querySelector: (s) => el(s), querySelectorAll: () => [],
  addEventListener: (e, f) => { handlers[e] = f; }, activeElement: null, contains: () => true,
};
global.window = { scrollTo() {}, crypto: webcrypto };
global.crypto = webcrypto;
global.navigator = {};
const ss = new Map();
global.sessionStorage = { getItem: (k) => (ss.has(k) ? ss.get(k) : null), setItem: (k, v) => ss.set(k, v), removeItem: (k) => ss.delete(k) };
global.FormData = function (f) { this.forEach = (cb) => Object.keys(f._fd).forEach((k) => cb(f._fd[k], k)); };

(0, eval)(fs.readFileSync(path.join(__dirname, '.build','app.js'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const click = (act, extra = {}, sure = false) => handlers.click({ target: { closest: () => ({ dataset: Object.assign({ act }, extra), classList: { contains: () => sure, add() {} }, textContent: '' }) } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
async function login(u, p) {
  el('#lu').value = u; el('#lp').value = p;
  await el('#lf')._l.submit({ preventDefault() {} });
  await sleep(120);
}
async function submitSheet(fd) {
  el('#f')._fd = fd;
  el('#f')._l.submit({ preventDefault() {} });
  await sleep(400);
}

(async () => {
  await sleep(600);
  await login('demo', 'demo1234');
  const view = () => strip(el('#view').innerHTML);
  console.log('Arquivar e excluir locações encerradas');
  click('tab', { tab: 'locacoes' }); click('locFiltro', { v: 'encerradas' }); await sleep(50);
  ok(/Encerradas 1/.test(view()) && !/Arquivadas/.test(view()), 'uma encerrada, ainda sem aba de arquivadas');
  const html = el('#view').innerHTML;
  ok(/data-act="excluirLoc"/.test(html), 'encerrada tem botão Excluir');
  const quit = /data-act="arquivarLoc"[^>]*data-v="1"/.test(html);
  console.log('  (quitada: ' + quit + ')');
  ok(!/data-act="encerrar"/.test(html), 'encerrada não tem Encerrar');
  if (quit) {
    click('arquivarLoc', { id: 'ex-l3', v: '1' }); await sleep(100);
    ok(/Encerradas 0/.test(view()) && /Arquivadas 1/.test(view()), 'arquivar tira da lista e cria aba Arquivadas');
    click('locFiltro', { v: 'arquivadas' }); await sleep(50);
    ok(/data-v="0"/.test(el('#view').innerHTML) && /Desarquivar/.test(view()), 'aba Arquivadas oferece Desarquivar');
    click('arquivarLoc', { id: 'ex-l3', v: '0' }); await sleep(100);
    click('locFiltro', { v: 'encerradas' }); await sleep(50);
    ok(/Encerradas 1/.test(view()), 'desarquivar devolve à lista');
  }
  click('excluirLoc', { id: 'ex-l3' }); await sleep(30);
  ok(/Encerradas 1/.test(view()), 'primeiro toque só pede confirmação');
  click('excluirLoc', { id: 'ex-l3' }, true); await sleep(300);
  ok(/Nenhuma locação encerrada/.test(view()), 'segundo toque exclui a locação');
  click('locFiltro', { v: 'ativas' }); await sleep(50);
  ok(/Ativas 2/.test(view()), 'ativas continuam intactas');
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
