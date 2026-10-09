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
  const view = () => strip(el('#view').innerHTML);
  console.log('Visão do cliente: resumo, parcelas, encargos e caução');
  await login('rafael.moreira', 'demo1234');
  ok(/Tudo em dia/.test(view()) && /Próxima cobrança: seg 12\/10\/2026/.test(view()), 'resumo no topo: tudo em dia e próxima cobrança');
  ok(/Copiar Pix da próxima parcela/.test(view()), 'botão de Pix da próxima parcela');
  ok(/Parcelas semanais/.test(view()) && /Paga/.test(view()) && /A vencer/.test(view()), 'extrato mostra parcelas pagas e a vencer');
  ok(/A caução de R\$\s?300,00 fica com o dono/.test(view()), 'caução explicada enquanto a locação está ativa');
  click('sair'); await sleep(50);
  await login('demo', 'demo1234');
  click('tab', { tab: 'locacoes' }); await sleep(30);
  click('pagamentos', { id: 'ex-l1' }); await sleep(30);
  const pg = (el('#sheet-body').innerHTML.match(/data-act="delPag" data-id="([^"]+)"/g) || []);
  ok(pg.length >= 1, 'achou pagamentos para remover');
  const ids = pg.map(x => x.match(/data-id="([^"]+)"/)[1]);
  // remove o pagamento mais recente para simular atraso
  for (const id of ids.slice(0, 1)) { click('delPag', { id, loc: 'ex-l1' }, true); await sleep(200); }
  click('fechar'); click('sair'); await sleep(50);
  await login('rafael.moreira', 'demo1234');
  ok(/Em atraso/.test(view()) && /R\$\s?600,00/.test(view()), 'resumo vira "Em atraso" com o valor devido');
  ok(/multa de 2% e juros de 1% ao mês/.test(view()), 'explica multa e juros do atraso');
  ok(/Atrasada \d+ dias?/.test(view()), 'parcela atrasada aparece com os dias de atraso');
  ok(/Pagar por Pix/.test(view()), 'botão Pagar por Pix no resumo');
  ok(!/Documentos anexados|\.pdf/.test(view()), 'cliente não vê anexos de documentos');
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
