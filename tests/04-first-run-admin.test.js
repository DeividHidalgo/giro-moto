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
    rpc:async(n,a)=>{calls.rpc.push([n,a]);if(n==='precisa_setup')return {data:!PROFILES.some(p=>p.role==='admin'),error:null};if(n==='criar_primeiro_admin'){if(PROFILES.some(p=>p.role==='admin'))return {data:null,error:{message:'já existe administrador'}};PROFILES.push({user_id:a.p_user,role:'admin',cliente_id:null});return {data:null,error:null}};if(n==='admin_delete_user'){USERS.forEach((u,e)=>{if(u.id===a.p_user)USERS.delete(e)});const i=PROFILES.findIndex(p=>p.user_id===a.p_user);if(i>-1)PROFILES.splice(i,1)}if(n==='admin_set_password'){USERS.forEach(u=>{if(u.id===a.p_user)u.pw=a.p_password})}return {data:null,error:null}},
    auth:{
      signInWithPassword:async({email,password})=>{const u=USERS.get(email);if(!u||u.pw!==password)return {data:null,error:{message:'Invalid login credentials'}};if(persist)SESSION=u;return {data:{user:u},error:null}},
      signUp:async({email,password})=>{calls.signUp.push(email);if(USERS.has(email))return {data:{user:{identities:[]}},error:null};const u={id:'u-'+USERS.size+'-'+Math.random().toString(36).slice(2,6),pw:password,email};USERS.set(email,u);return {data:{user:u,session:null},error:null}},
      getUser:async()=>({data:{user:SESSION}}), getSession:async()=>({data:{session:SESSION?{}:null}}),
      signOut:async()=>{if(persist){SESSION=null;authCb.forEach(f=>f('SIGNED_OUT'))}return {}},
      onAuthStateChange(f){authCb.push(f);return {data:{subscription:{}}}}
    }
  };
}
global.window={scrollTo(){},crypto:global.crypto,supabase:{createClient:(u,k,o)=>client(o)}};


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
  ok(el('#lsetup').hidden===false,'sem administrador: aparece "Primeiro acesso"');
  click('x'); el('#lsetup')._l.click(); await sleep(30);
  ok(/Criar administrador/.test(el('#sheet-title').textContent),'abre o formulário');
  await submitSheet({usuario:'Jú',senha:'Senha-Forte-9',senha2:'Senha-Forte-9'}); ok(/3 a 30/.test(el('#ferr').textContent),'recusa usuário inválido');
  await submitSheet({usuario:'admin',senha:'curta',senha2:'curta'}); ok(/8 caracteres/.test(el('#ferr').textContent),'recusa senha curta');
  await submitSheet({usuario:'admin',senha:'Senha-Forte-9',senha2:'Senha-Outra-9'}); ok(/não são iguais/.test(el('#ferr').textContent),'recusa senhas diferentes');
  await submitSheet({usuario:'admin',senha:'Senha-Forte-9',senha2:'Senha-Forte-9'}); await sleep(300);
  ok(calls.signUp.includes('teste+admin@exemplo.com'),'cria o usuário no Auth');
  ok(calls.rpc.some(c=>c[0]==='criar_primeiro_admin'),'confirma e define como administrador pelo servidor');
  ok(PROFILES.some(p=>p.role==='admin'),'perfil de administrador criado');
  ok(el('#shell').hidden===false&&el('.tabs').hidden===false,'entra direto como administrador');
  ok(el('#lsetup').hidden===true,'botão de primeiro acesso some');
  click('sair'); await sleep(100);
  await login('Admin','Senha-Forte-9'); ok(el('#shell').hidden===false,'login normal funciona depois');
  click('sair'); await sleep(100);
  // segunda tentativa de tomar o sistema
  const r=await client({}).rpc('criar_primeiro_admin',{p_user:'outro'}); ok(!!r.error,'não deixa criar um segundo administrador pelo atalho');
  console.log(`\n${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})().catch(e=>{console.error('ERRO NO TESTE',e);process.exit(2)});
