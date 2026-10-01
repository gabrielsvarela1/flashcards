-- Fase 3: limites de uso da IA, lembretes por notificação e registo de erros.
-- A app funciona sem esta migration (as funcionalidades ficam inativas).

-- ---------------------------------------------------------------------------
-- Uso da IA: uma linha por pedido, para limitar pedidos por utilizador e dia.
-- A chave do Gemini é partilhada por todos os utilizadores da instância.
-- ---------------------------------------------------------------------------

create table public.ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('generate', 'grade')),
  created_at timestamptz not null default now()
);

create index ai_usage_user_kind_created_idx on public.ai_usage (user_id, kind, created_at desc);

alter table public.ai_usage enable row level security;

-- Só leitura e inserção: quem apagasse linhas contornava o limite.
revoke all on public.ai_usage from anon, authenticated;
grant select, insert on public.ai_usage to authenticated;

create policy "ai_usage: dono lê"   on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "ai_usage: dono cria" on public.ai_usage for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Registo de erros: a app escreve, só o painel do Supabase lê.
-- ---------------------------------------------------------------------------

create table public.error_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  source     text not null check (source in ('server', 'client')),
  message    text not null check (char_length(message) <= 2000),
  detail     text check (char_length(detail) <= 8000),
  path       text check (char_length(path) <= 500),
  created_at timestamptz not null default now()
);

create index error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

revoke all on public.error_logs from anon, authenticated;
grant insert on public.error_logs to authenticated;

create policy "error_logs: utilizador cria" on public.error_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Notificações push: uma subscrição por dispositivo.
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create policy "push: dono lê"    on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "push: dono apaga" on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- A inserção passa por esta função: se o dispositivo já estava associado a
-- outra conta (o mesmo browser com outro login), a subscrição muda de dono.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lembrete diário (cron da Vercel). O cron não tem sessão de utilizador, por
-- isso usa funções que exigem um segredo; aqui guarda-se só o SHA-256 dele.
--
-- Depois desta migration, define o segredo (o mesmo valor de CRON_SECRET):
--   insert into app_private.settings (key, value)
--   values ('cron_secret_sha256', encode(sha256(convert_to('<CRON_SECRET>', 'UTF8')), 'hex'))
--   on conflict (key) do update set value = excluded.value;
-- ---------------------------------------------------------------------------

create schema app_private;

create table app_private.settings (
  key   text primary key,
  value text not null
);

create function app_private.check_cron_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select value into expected from app_private.settings where key = 'cron_secret_sha256';
  if expected is null
     or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> expected then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Subscrições de quem tem cards para rever agora, com a contagem.
create function public.push_targets(p_secret text)
returns table (endpoint text, p256dh text, auth text, due_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.check_cron_secret(p_secret);
  return query
    select s.endpoint, s.p256dh, s.auth, count(c.id)
    from public.push_subscriptions s
    join public.decks d on d.user_id = s.user_id
    join public.cards c on c.deck_id = d.id and c.due <= now()
    group by s.id;
end;
$$;

-- Apaga subscrições que o serviço de push deu como expiradas.
create function public.push_forget(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.check_cron_secret(p_secret);
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

revoke all on function app_private.check_cron_secret(text) from public, anon, authenticated;
revoke all on function public.push_targets(text) from public;
revoke all on function public.push_forget(text, text[]) from public;
grant execute on function public.push_targets(text) to anon, authenticated;
grant execute on function public.push_forget(text, text[]) to anon, authenticated;
