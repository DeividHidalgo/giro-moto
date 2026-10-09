-- Row-level-security tests. Run ONLY against a throw-away local PostgreSQL (see run.sh).
-- Order: auth-stub.sql, ../../sql/schema.sql, then this file.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect(label text, cond boolean) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', label; end if; raise notice 'ok   %', label; end $$;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','admin@t.dev'),
 ('00000000-0000-0000-0000-0000000000c1','c1@t.dev'),
 ('00000000-0000-0000-0000-0000000000c2','c2@t.dev');

-- first-run admin: allowed once, then closed
select pg_temp.expect('precisa_setup is true on empty database', public.precisa_setup());
select public.criar_primeiro_admin('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('precisa_setup is false after the first admin', not public.precisa_setup());
do $$ begin
  begin perform public.criar_primeiro_admin('00000000-0000-0000-0000-0000000000c1'); raise exception 'FAIL: second admin was created';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'ok   a second first-admin call is refused';
end $$;

insert into public.profiles values ('00000000-0000-0000-0000-0000000000c1','cliente','c1'),('00000000-0000-0000-0000-0000000000c2','cliente','c2') on conflict do nothing;
insert into docs(col,id,data) values
('motos','m1','{"modelo":"CG"}'),('motos','m2','{"modelo":"Biz"}'),('motos','m3','{"modelo":"Fazer"}'),
('clientes','c1','{"nome":"Rafael"}'),('clientes','c2','{"nome":"Juliana"}'),
('locacoes','l1','{"clienteId":"c1","motoId":"m1"}'),('locacoes','l2','{"clienteId":"c2","motoId":"m2"}'),
('pagamentos','p1','{"clienteId":"c1","locacaoId":"l1"}'),('pagamentos','p2','{"clienteId":"c2","locacaoId":"l2"}'),
('vistorias','v1','{"clienteId":"c1"}'),('vistorias','v2','{"clienteId":"c2"}'),
('vistorias/v1/fotos','f1','{"dataUrl":"x"}'),('vistorias/v2/fotos','f2','{"dataUrl":"y"}'),
('config','pix','{"chave":"k"}'),('config','termo','{"texto":"t"}'),('config','outro','{"x":1}'),
('clientes/c1/anexos','x1','{"dataUrl":"doc"}'),('acessos','a-c1','{"clienteId":"c1","usuario":"rafael"}'),('manutencoes','r1','{"motoId":"m1"}');

-- customer c1
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select pg_temp.expect('customer sees only own contract', (select count(*) from docs where col='locacoes')=1);
select pg_temp.expect('customer sees only own payments', (select count(*) from docs where col='pagamentos' and data->>'clienteId'='c1')=(select count(*) from docs where col='pagamentos'));
select pg_temp.expect('customer sees only own bike', (select count(*) from docs where col='motos')=1);
select pg_temp.expect('customer sees only own inspection photos', (select count(*) from docs where col like 'vistorias/%/fotos')=1);
select pg_temp.expect('customer reads pix and termo config only', (select count(*) from docs where col='config')=2);
select pg_temp.expect('customer cannot read other customers', (select count(*) from docs where col='clientes')<=1);
select pg_temp.expect('customer cannot read ID-document attachments', (select count(*) from docs where col like 'clientes/%')=0);
select pg_temp.expect('customer cannot read access list', (select count(*) from docs where col='acessos')=0);
select pg_temp.expect('customer cannot read maintenance', (select count(*) from docs where col='manutencoes')=0);
do $$ begin
  begin insert into docs values ('pagamentos','hack','{}'); raise exception 'FAIL: customer wrote';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'ok   customer cannot insert';
end $$;
update docs set data='{"x":1}' where col='locacoes';
select pg_temp.expect('customer update changes nothing', (select data->>'x' from docs where col='locacoes' and id='l1') is null);
delete from docs where col='pagamentos';
reset role;
select pg_temp.expect('customer delete removed nothing', (select count(*) from docs where col='pagamentos')=2);

-- admin
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select pg_temp.expect('admin sees everything', (select count(*) from docs)=19);
insert into docs values ('motos','m9','{}');
select pg_temp.expect('admin can write', (select count(*) from docs where col='motos')=4);
reset role;

-- anon
set role anon;
do $$ begin
  begin perform count(*) from docs; raise exception 'FAIL: anon read docs';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'ok   anon has no access to docs';
end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
