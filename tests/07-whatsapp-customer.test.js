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
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: (t, q) => 'data:image/jpeg;base64,' + 'A'.repeat(800) }),
};
global.window = { scrollTo() {}, crypto: webcrypto };
global.crypto = webcrypto;
global.navigator = {};
const ss = new Map();
global.sessionStorage = { getItem: (k) => (ss.has(k) ? ss.get(k) : null), setItem: (k, v) => ss.set(k, v), removeItem: (k) => ss.delete(k) };
global.FormData = function (f) { this.forEach = (cb) => Object.keys(f._fd).forEach((k) => cb(f._fd[k], k)); };
global.FileReader = function () { this.readAsDataURL = () => { this.result = 'data:image/png;base64,AA'; setTimeout(() => this.onload(), 0); }; };
global.Image = function () { Object.defineProperty(this, 'src', { set: () => { this.width = 1600; this.height = 1200; setTimeout(() => this.onload(), 0); } }); };

(0, eval)(fs.readFileSync(path.join(__dirname, '.build','app.js'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const click = (act, extra = {}, sure = false) => handlers.click({ target: { closest: () => ({ dataset: Object.assign({ act }, extra), classList: { contains: () => sure, add() {} }, textContent: '' }) } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
async function login(u, p) { el('#lu').value = u; el('#lp').value = p; await el('#lf')._l.submit({ preventDefault() {} }); await sleep(150); }
async function submitSheet(fd) { el('#f')._fd = fd; el('#f')._l.submit({ preventDefault() {} }); await sleep(400); }
const view = () => strip(el('#view').innerHTML);
const sheet = () => strip(el('#sheet-body').innerHTML);

(async () => {
  await sleep(600); await login('demo','demo1234');
  console.log('Dono cadastra o WhatsApp do negócio');
  ok(/WhatsApp do negócio/.test(view()) && /Cadastrar/.test(view()), 'painel pede o número');
  click('cfgContato'); await sleep(30);
  await submitSheet({ whatsapp: '123' }); ok(/Número inválido/.test(el('#ferr').textContent), 'recusa número inválido');
  await submitSheet({ whatsapp: '(15) 99812-3344' });
  ok(/Clientes falam com você em \(15\) 99812-3344/.test(view()), 'número salvo aparece no painel');
  click('tab',{tab:'clientes'}); await sleep(40); click('editCliente',{id:'ex-c2'}); click('acessoNovo',{id:'ex-c2'}); await sleep(30);
  await submitSheet({ usuario: 'juliana.prado', senha: 'Senha123' }); click('fechar'); click('sair'); await sleep(30);
  console.log('Cliente vê os botões');
  await login('juliana.prado','Senha123'); await sleep(250);
  const html = el('#view').innerHTML, v = view();
  ok(/Falar com o dono/.test(v) && /Enviar comprovante/.test(v), 'cliente vê "Falar com o dono" e "Enviar comprovante"');
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g,'&'));
  ok(links.length === 2 && links.every(l => l.indexOf('https://wa.me/5515998123344?text=') === 0), 'os dois links abrem o número do dono (55 + DDD + número)');
  ok(/Juliana%20Prado|Aqui%20%C3%A9%20Juliana/.test(links[0]) && /Honda%20Biz%20125/.test(links[0]), 'mensagem identifica o cliente e a moto');
  ok(/comprovante/.test(decodeURIComponent(links[1])) && /em%20aberto/.test(links[1]), 'comprovante cita o valor em aberto');
  click('cfgContato'); await sleep(30); ok(el('#sheet').hidden===true, 'cliente não edita o contato do dono');
  click('whats',{id:'ex-l2'}); await sleep(30); ok(el('#sheet').hidden===true, 'cliente continua sem o WhatsApp de cobrança');
  click('sair'); await sleep(30);
  console.log('Sem número cadastrado, o cliente não vê botões');
  await login('demo','demo1234'); await sleep(150);
  click('cfgContato'); await sleep(30); await submitSheet({ whatsapp: '' });
  click('sair'); await sleep(30); await login('juliana.prado','Senha123'); await sleep(250);
  ok(!/Falar com o dono/.test(view()), 'sem número, botões escondidos');
  console.log(`\n${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})().catch((e)=>{console.error('ERRO NO TESTE',e);process.exit(2)});
