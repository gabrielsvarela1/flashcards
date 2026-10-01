-- Fase 1: decks, cards e reviews com RLS.
-- Cada utilizador só vê e altera os próprios dados.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.decks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create index decks_user_id_idx on public.decks (user_id);

-- Os campos FSRS espelham a interface Card do ts-fsrs.
-- state: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references public.decks (id) on delete cascade,
  front          text not null check (char_length(trim(front)) between 1 and 2000),
  back           text not null check (char_length(trim(back)) between 1 and 2000),

  due            timestamptz not null default now(),
  stability      double precision not null default 0,
  difficulty     double precision not null default 0,
  elapsed_days   integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps           integer not null default 0,
  lapses         integer not null default 0,
  state          smallint not null default 0 check (state between 0 and 3),
  last_review    timestamptz,

  created_at     timestamptz not null default now()
);

create index cards_deck_id_due_idx on public.cards (deck_id, due);

-- rating: 1 = Errei (Again), 2 = Difícil (Hard), 3 = Bom (Good), 4 = Fácil (Easy)
-- state_before / state_after: snapshot dos campos FSRS do card.
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.cards (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 4),
  reviewed_at  timestamptz not null default now(),
  state_before jsonb not null,
  state_after  jsonb not null
);

create index reviews_card_id_reviewed_at_idx on public.reviews (card_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.decks   enable row level security;
alter table public.cards   enable row level security;
alter table public.reviews enable row level security;

grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert on public.reviews to authenticated;

-- decks: dono direto
create policy "decks: dono lê"     on public.decks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "decks: dono cria"   on public.decks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "decks: dono edita"  on public.decks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "decks: dono apaga"  on public.decks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- cards: dono do deck
create policy "cards: dono lê"     on public.cards for select to authenticated
  using (exists (select 1 from public.decks d
                 where d.id = deck_id and d.user_id = (select auth.uid())));
create policy "cards: dono cria"   on public.cards for insert to authenticated
  with check (exists (select 1 from public.decks d
                      where d.id = deck_id and d.user_id = (select auth.uid())));
-- with check impede mover um card para um deck de outro utilizador
create policy "cards: dono edita"  on public.cards for update to authenticated
  using (exists (select 1 from public.decks d
                 where d.id = deck_id and d.user_id = (select auth.uid())))
  with check (exists (select 1 from public.decks d
                      where d.id = deck_id and d.user_id = (select auth.uid())));
create policy "cards: dono apaga"  on public.cards for delete to authenticated
  using (exists (select 1 from public.decks d
                 where d.id = deck_id and d.user_id = (select auth.uid())));

-- reviews: dono do card (via deck). Histórico só de leitura e inserção.
create policy "reviews: dono lê"   on public.reviews for select to authenticated
  using (exists (select 1 from public.cards c
                 join public.decks d on d.id = c.deck_id
                 where c.id = card_id and d.user_id = (select auth.uid())));
create policy "reviews: dono cria" on public.reviews for insert to authenticated
  with check (exists (select 1 from public.cards c
                      join public.decks d on d.id = c.deck_id
                      where c.id = card_id and d.user_id = (select auth.uid())));
