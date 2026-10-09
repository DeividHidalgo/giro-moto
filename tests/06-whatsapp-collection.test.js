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
  click('cfgPix'); await submitSheet({ chave: '+5515998123344', nome: 'Locadora Exemplo', cidade: 'Campinas' });
  click('tab',{tab:'locacoes'}); await sleep(60);
  ok(/WhatsApp/.test(view()), 'cartões têm o botão WhatsApp');
  console.log('Cobrança em atraso (Juliana, (11) 97766-2210)');
  click('whats',{id:'ex-l2'}); await sleep(30);
  ok(/Cobrar no WhatsApp/.test(el('#sheet-title').textContent), 'abre a tela do WhatsApp');
  ok(el('#f-wmod').value==='atraso', 'escolhe sozinho o modelo de cobrança em atraso');
  el('#f-wpix').checked=true; el('#f-wpix')._l.change();
  let msg=el('#f-wmsg').value, href=el('#wa-link').href;
  ok(/^Olá, Juliana!/.test(msg) && /Giro Moto/.test(msg), 'mensagem começa pelo nome do cliente');
  ok(/R\$\s*600,00 da locação da Honda Biz 125 \(QWE-2C45|QWE2C45\)/.test(msg)||/R\$\s*600,00 da locação da Honda Biz 125/.test(msg), 'traz o valor e a moto');
  ok(/000201/.test(msg) && /comprovante/.test(msg), 'inclui o Pix copia e cola e o pedido de comprovante');
  ok(href.indexOf('https://wa.me/5511977662210?text=')===0, 'link com o número no padrão internacional (55 + DDD + número)');
  ok(decodeURIComponent(href.split('text=')[1])===msg, 'o texto do link é a mensagem');
  ok(!/disabled/.test(el('#wa-link').className), 'link habilitado');
  el('#f-wpix').checked=false; el('#f-wpix')._l.change();
  ok(!/000201/.test(el('#f-wmsg').value), 'desmarcar o Pix tira o código da mensagem');
  el('#f-wmod').value='lembrete'; el('#f-wmod')._l.change();
  ok(/Lembrete: a cobrança semanal de R\$\s*\d/.test(el('#f-wmsg').value), 'modelo de lembrete de vencimento');
  el('#f-wmod').value='devolucao'; el('#f-wmod')._l.change();
  ok(/devolução da Honda Biz 125/.test(el('#f-wmsg').value) && !/comprovante/.test(el('#f-wmsg').value), 'modelo de devolução, sem pedido de comprovante');
  el('#f-wmsg').value='Mensagem editada à mão'; el('#f-wmsg')._l.input();
  ok(el('#wa-link').href.endsWith(encodeURIComponent('Mensagem editada à mão')), 'editar o texto atualiza o link');
  click('fechar');
  console.log('Contrato em dia (Rafael, (15) 99812-3344) e telefone inválido');
  click('whats',{id:'ex-l1'}); await sleep(30);
  ok(el('#f-wmod').value==='lembrete', 'contrato em dia: sugere lembrete de vencimento');
  ok(el('#wa-link').href.indexOf('https://wa.me/5515998123344')===0, 'número de Rafael formatado');
  click('fechar');
  click('tab',{tab:'clientes'}); await sleep(40);
  click('editCliente',{id:'ex-c1'}); await sleep(30);
  await submitSheet({ nome:'Rafael Moreira', telefone:'12345', cnh:'04821937561', cnhValidade:'2030-01-01' });
  click('tab',{tab:'locacoes'}); await sleep(60);
  click('whats',{id:'ex-l1'}); await sleep(30);
  ok(/Telefone inválido/.test(el('#sheet-body').innerHTML) && /disabled/.test(el('#wa-link').className) && el('#wa-link').href==='#', 'telefone inválido desabilita o botão e avisa');
  click('fechar');
  console.log('Cliente não usa o WhatsApp do dono');
  click('tab',{tab:'clientes'}); await sleep(40); click('editCliente',{id:'ex-c2'}); click('acessoNovo',{id:'ex-c2'}); await sleep(30);
  await submitSheet({ usuario: 'juliana.prado', senha: 'Senha123' }); click('fechar'); click('sair'); await sleep(30);
  await login('juliana.prado','Senha123'); await sleep(250);
  ok(!/WhatsApp/.test(view()), 'cliente não vê o botão');
  click('whats',{id:'ex-l2'}); await sleep(30); ok(el('#sheet').hidden===true, 'ação bloqueada para o cliente');
  console.log(`\n${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})().catch((e)=>{console.error('ERRO NO TESTE',e);process.exit(2)});
