-- Giro Moto: estrutura do banco e regras de acesso (rode uma vez no SQL Editor do Supabase)
-- O administrador é criado depois, pela própria tela do app (botão "Primeiro acesso").

create table if not exists public.docs (
  col  text not null,
  id   text not null,
  data jsonb not null default '{}'::jsonb,
  primary key (col, id)
);
create index if not exists docs_cliente_idx on public.docs ((data->>'clienteId'), col);
create index if not exists docs_moto_idx    on public.docs ((data->>'motoId'), col);

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','cliente')),
  cliente_id text
);

-- funções auxiliares (security definer evita recursão das regras)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.my_cliente() returns text
language sql stable security definer set search_path = public as $$
  select cliente_id from public.profiles where user_id = auth.uid() and role = 'cliente'
$$;

create or replace function public.cliente_tem_moto(p_moto text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs l
    where l.col = 'locacoes' and l.data->>'clienteId' = public.my_cliente() and l.data->>'motoId' = p_moto)
$$;

create or replace function public.cliente_tem_vistoria(p_vist text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs v
    where v.col = 'vistorias' and v.id = p_vist and v.data->>'clienteId' = public.my_cliente())
$$;

-- regras de acesso (RLS)
alter table public.docs enable row level security;
alter table public.profiles enable row level security;

drop policy if exists docs_admin on public.docs;
create policy docs_admin on public.docs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists docs_cliente_le on public.docs;
create policy docs_cliente_le on public.docs for select to authenticated
using (
  public.my_cliente() is not null and (
       (col = 'clientes' and id = public.my_cliente())
    or (col = 'config'   and id in ('pix','termo','cobranca','contato'))
    or (col in ('locacoes','pagamentos','vistorias','ocorrencias') and data->>'clienteId' = public.my_cliente())
    or (col = 'motos'    and public.cliente_tem_moto(id))
    or (col like 'vistorias/%/fotos' and public.cliente_tem_vistoria(split_part(col,'/',2)))
  )
);

drop policy if exists prof_le on public.profiles;
create policy prof_le on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists prof_admin_ins on public.profiles;
create policy prof_admin_ins on public.profiles for insert to authenticated
  with check (public.is_admin() and role = 'cliente');
drop policy if exists prof_admin_del on public.profiles;
create policy prof_admin_del on public.profiles for delete to authenticated
  using (public.is_admin() and role = 'cliente');

revoke all on public.docs, public.profiles from anon;
grant select, insert, update, delete on public.docs, public.profiles to authenticated;

-- o administrador troca senha e remove acesso de CLIENTES (nunca de administradores)
create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'senha curta'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user and role = 'cliente') then
    raise exception 'usuário não é cliente';
  end if;
  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = p_user;
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user and role = 'cliente') then
    raise exception 'usuário não é cliente';
  end if;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public.admin_set_password(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- atualização em tempo real entre aparelhos
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- primeiro acesso: a tela do app cria o administrador (só funciona enquanto não existir nenhum)
create or replace function public.precisa_setup() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where role = 'admin')
$$;

create or replace function public.criar_primeiro_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'já existe administrador';
  end if;
  if not exists (select 1 from auth.users
                  where id = p_user
                    and created_at > now() - interval '15 minutes') then
    raise exception 'usuário inválido ou expirado';
  end if;
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_user;
  insert into public.profiles (user_id, role) values (p_user, 'admin');
end $$;

revoke all on function public.precisa_setup() from public;
revoke all on function public.criar_primeiro_admin(uuid) from public;
grant execute on function public.precisa_setup() to anon, authenticated;
grant execute on function public.criar_primeiro_admin(uuid) to anon, authenticated;
