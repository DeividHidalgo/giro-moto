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

global.FileReader = function () { this.readAsDataURL = (f) => setTimeout(() => this.onload && this.onload({}), 0) || (this.result = 'data:' + f.type + ';base64,QUJD'); };
global.FileReader = class { readAsDataURL(f) { this.result = 'data:' + f.type + ';base64,QUJD'; setTimeout(() => this.onload(), 0); } };
let fetched = [];
global.fetch = async (u) => { fetched.push(u); if (/00000000/.test(u)) return { ok: true, json: async () => ({ erro: true }) };
  return { ok: true, json: async () => ({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' }) }; };
(async () => {
  await sleep(600);
  await login('demo', 'demo1234');
  const view = () => strip(el('#view').innerHTML);
  console.log('Cadastro do cliente: CPF, RG, endereço por CEP, anexos');
  click('tab', { tab: 'clientes' }); click('novoCliente'); await sleep(50);
  ok(['#f-cpf', '#f-rg', '#f-cep', '#f-end', '#f-num', '#f-comp', '#f-bai', '#f-cid', '#f-uf', '#f-anexos'].every(i => /id="/.test(el('#sheet-body').innerHTML.replace(/./s, '') + el('#sheet-body').innerHTML) && el('#sheet-body').innerHTML.indexOf('id="' + i.slice(1) + '"') > -1), 'formulário tem todos os campos novos');
  el('#f-cpf').value = '52998224725'; el('#f-cpf')._l.input(); ok(el('#f-cpf').value === '529.982.247-25', 'CPF é formatado ao digitar');
  el('#f-cep').value = '01001000'; el('#f-cep')._l.input(); await sleep(50);
  ok(el('#f-cep').value === '01001-000' && fetched[0] === 'https://viacep.com.br/ws/01001000/json/', 'CEP formatado e consultado no ViaCEP');
  ok(el('#f-end').value === 'Praça da Sé' && el('#f-bai').value === 'Sé' && el('#f-cid').value === 'São Paulo' && el('#f-uf').value === 'SP', 'CEP preenche rua, bairro, cidade e UF');
  el('#f-cep').value = '00000000'; el('#f-cep')._l.input(); await sleep(50);
  ok(/não encontrado/.test(el('#cep-st').textContent), 'CEP inexistente avisa para preencher à mão');
  el('#f-cep').value = '01001000'; el('#f-cep')._l.input(); await sleep(50);
  const base = { nome: 'Cliente Teste', telefone: '(11) 98888-7777', cnh: '123456', cnhValidade: '2030-01-01', rg: '12.345.678-9', cep: '01001-000', endereco: 'Praça da Sé', numero: '10', complemento: 'ap 5', bairro: 'Sé', cidade: 'São Paulo', uf: 'sp' };
  await submitSheet({ ...base, cpf: '111.111.111-11' }); ok(/CPF inválido/.test(el('#ferr').textContent), 'CPF inválido é recusado');
  await submitSheet({ ...base, cpf: '529.982.247-25', cep: '123' }); ok(/8 números/.test(el('#ferr').textContent), 'CEP incompleto é recusado');
  await submitSheet({ ...base, cpf: '529.982.247-25', uf: 'S' }); ok(/UF/.test(el('#ferr').textContent), 'UF inválida é recusada');
  el('#f-anexos')._l.change({ target: { files: [{ type: 'application/pdf', size: 900000, name: 'grande.pdf' }], value: '' } }); await sleep(50);
  ok(!/grande\.pdf/.test(el('#agrid').innerHTML), 'PDF acima de 600 KB não é anexado');
  el('#f-anexos')._l.change({ target: { files: [{ type: 'application/pdf', size: 1000, name: 'cnh.pdf' }], value: '' } }); await sleep(50);
  ok(/cnh\.pdf/.test(el('#agrid').innerHTML) && /1 de 6|\(1 de 6\)/.test(el('#acount').textContent), 'PDF pequeno entra na lista de anexos');
  await submitSheet({ ...base, cpf: '529.982.247-25' });
  click('tab', { tab: 'clientes' }); await sleep(50);
  ok(/Cliente Teste/.test(view()), 'cliente salvo aparece na lista');
  const id = (el('#view').innerHTML.match(/data-act="editCliente" data-id="([^"]+)"[^>]*>(?:(?!<\/button>).)*Cliente Teste/s) || [])[1];
  ok(!!id, 'achou o cliente salvo');
  click('editCliente', { id }); await sleep(150);
  const sb = el('#sheet-body').innerHTML;
  ok(['529.982.247-25', '12.345.678-9', '01001-000', 'value="SP"', 'value="10"', 'ap 5'].every(x => sb.indexOf(x) > -1), 'dados salvos voltam na edição (CPF formatado, UF em maiúsculas)');
  ok(/cnh\.pdf/.test(el('#agrid').innerHTML), 'anexo salvo volta na edição');
  click('fechar');
  el('#q').value = '52998224725'; document.querySelector('#q'); handlers.input && handlers.input({ target: { id: 'q', value: '52998224725' } }); await sleep(50);
  ok(/Cliente Teste/.test(strip(el('#lista').innerHTML)), 'busca por CPF (só números) encontra o cliente');
  click('editCliente', { id }); await sleep(100);
  el('#del').classList = { contains: () => true, add() {}, remove() {} };
  await el('#del')._l.click({}); await sleep(300);
  click('tab', { tab: 'clientes' }); await sleep(50);
  ok(!/Cliente Teste/.test(view()), 'excluir o cliente funciona (e apaga os anexos)');
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
