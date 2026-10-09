// Testa a versão web (Supabase) com um cliente Supabase simulado em memória
const fs = require('fs'), path = require('path');
const els = {};
function el(id){ if(!els[id]) els[id]={id,innerHTML:'',textContent:'',hidden:false,value:'',type:'',dataset:{},_l:{},_fd:{},classList:{add(){},remove(){},contains(){return false}},addEventListener(ev,f){this._l[ev]=f},setAttribute(){},removeAttribute(){},focus(){},select(){},checkValidity(){return true},reportValidity(){},querySelector(){return null}}; return els[id]; }
el('#sheet').hidden=true; el('#toast').hidden=true; el('#shell').hidden=true; el('#lhint').hidden=true; el('#modo').hidden=true;
const handlers={}; let downloads=[];
global.document={querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener:(e,f)=>{handlers[e]=f},activeElement:null,contains:()=>true,
  body:{appendChild(){}},createElement:()=>({click(){downloads.push(this)},remove(){},set href(v){this._h=v},get href(){return this._h||''}})};
global.Blob=function(parts){this.parts=parts}; global.URL={createObjectURL:()=> 'blob:x',revokeObjectURL(){}};
global.crypto=require('node:crypto').webcrypto; global.navigator={}; global.FormData=function(f){this.forEach=cb=>Object.keys(f._fd).forEach(k=>cb(f._fd[k],k))};
const ss=new Map(); global.sessionStorage={getItem:k=>ss.has(k)?ss.get(k):null,setItem:(k,v)=>ss.set(k,v),removeItem:k=>ss.delete(k)};

// ---- Supabase simulado
const DB=new Map(), PROFILES=[], USERS=new Map(), calls={signUp:[],rpc:[],upsert:0};
let SESSION=null; const authCb=[];
const key=(c,i)=>c+'\u0000'+i;
class Q{
  constructor(t){this.t=t;this.f=[];this.op='select'}
  select(){return this} eq(k,v){this.f.push([k,v]);return this} order(){return this} range(a,b){this.r=[a,b];return this}
  maybeSingle(){this.one=true;return this} upsert(row){this.op='upsert';this.row=row;return this} insert(row){this.op='insert';this.row=row;return this} delete(){this.op='delete';return this}
  then(res,rej){return Promise.resolve().then(()=>this.exec()).then(res,rej)}
  match(r){return this.f.every(([k,v])=>k.startsWith('data->>')?String(r.data[k.slice(7)])===String(v):String(r[k])===String(v))}
  exec(){
    if(this.t==='profiles'){
      if(this.op==='insert'){PROFILES.push(this.row);return {data:null,error:null}}
      const rows=PROFILES.filter(r=>this.match(r)); return {data:this.one?(rows[0]||null):rows,error:null};
    }
    if(this.op==='upsert'){calls.upsert++;DB.set(key(this.row.col,this.row.id),JSON.parse(JSON.stringify(this.row)));return {data:null,error:null}}
    if(this.op==='delete'){for(const [k,r] of [...DB]) if(this.match(r))DB.delete(k);return {data:null,error:null}}
    let rows=[...DB.values()].filter(r=>this.match(r)).sort((a,b)=>a.id.localeCompare(b.id));
    if(this.r)rows=rows.slice(this.r[0],this.r[1]+1);
    return {data:this.one?(rows[0]||null):rows.map(r=>({id:r.id,data:r.data})),error:null};
  }
}
function client(opts){
  const persist=opts&&opts.auth&&opts.auth.persistSession!==false;
  return {
    from:t=>new Q(t),
    channel(){const c={on(){return c},subscribe(){return c}};return c}, removeChannel(){},
    rpc:async(n,a)=>{calls.rpc.push([n,a]);if(n==='admin_delete_user'){USERS.forEach((u,e)=>{if(u.id===a.p_user)USERS.delete(e)});const i=PROFILES.findIndex(p=>p.user_id===a.p_user);if(i>-1)PROFILES.splice(i,1)}if(n==='admin_set_password'){USERS.forEach(u=>{if(u.id===a.p_user)u.pw=a.p_password})}return {data:null,error:null}},
    auth:{
      signInWithPassword:async({email,password})=>{const u=USERS.get(email);if(!u||u.pw!==password)return {data:null,error:{message:'Invalid login credentials'}};if(persist)SESSION=u;return {data:{user:u},error:null}},
      signUp:async({email,password})=>{calls.signUp.push(email);if(USERS.has(email))return {data:{user:{identities:[]}},error:null};const u={id:'u-'+USERS.size+'-'+Math.random().toString(36).slice(2,6),pw:password,email};USERS.set(email,u);return {data:{user:u,session:{}},error:null}},
      getUser:async()=>({data:{user:SESSION}}), getSession:async()=>({data:{session:SESSION?{}:null}}),
      signOut:async()=>{if(persist){SESSION=null;authCb.forEach(f=>f('SIGNED_OUT'))}return {}},
      onAuthStateChange(f){authCb.push(f);return {data:{subscription:{}}}}
    }
  };
}
global.window={scrollTo(){},crypto:global.crypto,supabase:{createClient:(u,k,o)=>client(o)}};
USERS.set('teste+admin@exemplo.com',{id:'adm-1',pw:'Senha-Teste-1',email:'teste+admin@exemplo.com'}); PROFILES.push({user_id:'adm-1',role:'admin',cliente_id:null});

(0,eval)(fs.readFileSync(path.join(__dirname,'.build','app_web.js'),'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const click=(act,extra={},sure=false)=>handlers.click({target:{closest:()=>({dataset:Object.assign({act},extra),classList:{contains:()=>sure,add(){}},textContent:''})}});
let pass=0,fail=0; const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
async function login(u,p){el('#lu').value=u;el('#lp').value=p;await el('#lf')._l.submit({preventDefault(){}});await sleep(250)}
async function submitSheet(fd){el('#f')._fd=fd;el('#f')._l.submit({preventDefault(){}});await sleep(300)}
const view=()=>strip(el('#view').innerHTML);
(async()=>{
  await sleep(300);
  ok(el('#lhint').hidden===true,'sem aviso de demonstração na versão web');
  console.log('Login');
  await login('Admin','errada'); ok(/incorretos/.test(el('#lerr').textContent)&&el('#shell').hidden===true,'senha errada não entra');
  await login('Admin','Senha-Teste-1'); ok(el('#shell').hidden===false&&el('.tabs').hidden===false,'administrador entra e vê as abas');
  ok(/Backup dos dados/.test(view()),'painel tem o backup');
  console.log('Cadastros');
  click('novoCliente'); await sleep(30);
  await submitSheet({nome:'Juliana Prado',telefone:'(11) 97766-2210',cnh:'05937184420',cnhValidade:'2030-01-01'});
  click('tab',{tab:'clientes'}); await sleep(100);
  const cid=[...DB.values()].find(r=>r.col==='clientes').id;
  ok(!!cid,'cliente gravado no banco');
  click('novaMoto'); await sleep(30);
  await submitSheet({modelo:'Honda Biz 125',placa:'QWE2C45',cor:'Preta',ano:'2023',km:'31050',semanal:'600',status:'disponivel'});
  const motoId=[...DB.values()].find(r=>r.col==='motos').id; ok(!!motoId,'moto gravada no banco');
  console.log('Acesso do cliente');
  click('editCliente',{id:cid}); await sleep(50);
  ok(/Criar acesso do cliente/.test(el('#sheet-body').innerHTML),'ficha oferece criar acesso');
  click('acessoNovo',{id:cid}); await sleep(30);
  await submitSheet({usuario:'juliana.prado',senha:'Senha123'});
  ok(calls.signUp.includes('teste+juliana.prado@exemplo.com'),'usuário criado no Auth com e-mail interno');
  ok(PROFILES.some(p=>p.role==='cliente'&&p.cliente_id===cid),'perfil de cliente vinculado ao cliente');
  const ac=DB.get(key('acessos','a-'+cid)).data;
  ok(ac.usuario==='juliana.prado'&&ac.userId&&!('hash' in ac)&&!JSON.stringify(ac).includes('Senha123'),'registro de acesso sem senha nem hash');
  ok(/Acesso pronto/.test(el('#sheet-title').textContent)&&/Senha: Senha123/.test(el('#sheet-body').innerHTML),'mostra os dados para enviar');
  click('fechar');
  click('editCliente',{id:cid}); await sleep(50);
  click('acessoNovo',{id:cid}); await sleep(30);
  await submitSheet({usuario:'juliana.prado',senha:'Senha123'});
  // segundo acesso para o mesmo cliente (já existe) deve ser tratado como existente
  click('fechar');
  console.log('Cliente entra');
  click('sair'); await sleep(100);
  ok(el('#shell').hidden===true&&el('#login').hidden===false,'sair volta ao login');
  await login('Juliana.Prado','Senha123'); await sleep(200);
  ok(el('#shell').hidden===false&&el('.tabs').hidden===true,'cliente entra sem as abas do dono');
  ok(/Olá, Juliana/.test(view()),'saudação do cliente');
  click('novaMoto'); await sleep(30); ok(el('#sheet').hidden===true,'ação de administrador ignorada para o cliente');
  click('sair'); await sleep(100);
  console.log('Nova senha, backup e remoção');
  await login('Admin','Senha-Teste-1'); await sleep(200);
  click('tab',{tab:'clientes'}); await sleep(60);
  click('editCliente',{id:cid}); await sleep(50);
  ok(/Nova senha/.test(el('#sheet-body').innerHTML)&&/Remover acesso/.test(el('#sheet-body').innerHTML),'ficha mostra nova senha e remover');
  click('acessoSenha',{id:cid}); await sleep(30);
  await submitSheet({usuario:'juliana.prado',senha:'Outra4567'});
  ok(calls.rpc.some(c=>c[0]==='admin_set_password'&&c[1].p_password==='Outra4567'),'nova senha vai pelo servidor');
  click('fechar');
  click('tab',{tab:'painel'}); await sleep(100);
  click('backup'); await sleep(400);
  ok(downloads.length===1,'backup gera download');
  click('tab',{tab:'clientes'}); await sleep(60);
  click('editCliente',{id:cid}); await sleep(50);
  click('acessoDel',{id:cid}); await sleep(20); click('acessoDel',{id:cid},true); await sleep(250);
  ok(calls.rpc.some(c=>c[0]==='admin_delete_user')&&!DB.has(key('acessos','a-'+cid)),'remover acesso apaga o usuário e o registro');
  click('sair'); await sleep(100);
  await login('juliana.prado','Outra4567'); ok(el('#shell').hidden===true,'acesso removido não entra mais');
  console.log('Usuário sem perfil');
  USERS.set('teste+fulano@exemplo.com',{id:'x9',pw:'abcdef',email:'teste+fulano@exemplo.com'});
  await login('fulano','abcdef'); ok(el('#shell').hidden===true&&/não tem acesso/.test(el('#lerr').textContent),'usuário sem perfil é recusado');
  console.log(`\n${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e);process.exit(2)});
