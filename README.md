# Flashcards

Web app de flashcards com **repetição espaçada**. Crias decks e cards, e o algoritmo **FSRS** decide quando deves rever cada card. Assim, o tempo de estudo vai para o que estás prestes a esquecer.

Este é um projeto de portfólio, pensado primeiro para o celular. Também gera cards automaticamente a partir de PDFs com IA.

## Funcionalidades

- Conta com email e palavra-passe (Supabase Auth), com confirmação por email
- Rotas protegidas: sem sessão, qualquer página redireciona para o login
- Decks: criar, mudar o nome e apagar
- Cards: criar, editar e apagar, com frente e verso
- Revisão: mostra só os cards com `due <= agora`. Revelas a resposta e avalias com **Errei / Difícil / Bom / Fácil**. Cada botão mostra quando o card volta (ex.: "Bom · 10 min"). O próximo agendamento é calculado no servidor com o [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs)
- Histórico de revisões, com o estado do card antes e depois de cada resposta
- Segurança com Row Level Security: cada utilizador só acede aos próprios dados
- UI mobile-first, com tema claro/escuro e botões ao alcance do polegar. Dá para instalar no ecrã principal
- **Cards gerados por IA:** fazes upload de um PDF (até 4 MB) e o Google Gemini sugere até 10, 20 ou 30 cards. Revês, editas ou descartas cada um antes de guardar

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions) + TypeScript |
| Estilo | [Tailwind CSS 4](https://tailwindcss.com) |
| Auth e base de dados | [Supabase](https://supabase.com) (Postgres + Auth) via `@supabase/ssr` |
| Agendamento | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (FSRS) |
| IA | [Google Gemini](https://ai.google.dev) via `@google/genai` (plano gratuito) |
| Deploy | [Vercel](https://vercel.com) |

## Correr localmente

Pré-requisitos: Node.js 20.9 ou superior e um projeto Supabase (o plano gratuito chega).

1. **Clonar e instalar**
   ```bash
   git clone https://github.com/gabrielsvarela1/flashcards.git
   cd flashcards
   npm install
   ```
2. **Variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```
   Preenche com os valores de **Project Settings → API** (ou do botão **Connect**) no painel do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`: o Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: a chave *anon* ou *publishable* (`sb_publishable_…`)
   - `GEMINI_API_KEY`: chave do [Google AI Studio](https://aistudio.google.com/apikey). Só é precisa para gerar cards de PDFs. Fica apenas no servidor
   - `GEMINI_MODEL` (opcional): por padrão `gemini-flash-latest`
3. **Criar as tabelas.** No Supabase, abre **SQL Editor**, cola o conteúdo de [`supabase/migrations/20261001000000_init.sql`](supabase/migrations/20261001000000_init.sql) e corre. Se usares a [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase db push` faz o mesmo.
4. **Configurar os URLs de autenticação** (ver abaixo).
5. **Arrancar**
   ```bash
   npm run dev
   ```
   Abre http://localhost:3000.

### Configuração da autenticação no Supabase

Em **Authentication → URL Configuration**:

- **Site URL:** o endereço principal da app (ex.: `https://o-teu-projeto.vercel.app`).
- **Redirect URLs:** todos os endereços onde a app corre, com `/**` no fim. Por exemplo:
  ```
  http://localhost:3000/**
  https://o-teu-projeto.vercel.app/**
  ```

O link do email de confirmação só volta para endereços desta lista. Se o endereço não estiver lá, o Supabase usa o Site URL, e é por isso que às vezes o link abre `localhost`.

**Confirmação de email.** Está ligada por padrão. Para testar mais rápido, podes desligá-la em **Authentication → Sign In / Providers → Email → Confirm email**. A app funciona nos dois modos.

**Confirmar noutro dispositivo.** O template padrão do email usa o fluxo PKCE. Por isso, o link só abre a sessão no mesmo navegador onde a conta foi criada. Noutro navegador, o email fica confirmado na mesma, mas tens de entrar com a palavra-passe. Para funcionar em qualquer dispositivo, muda o link em **Authentication → Emails → Confirm signup** para:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar email</a>
```

A rota `/auth/confirm` aceita os dois formatos.

## Deploy na Vercel

1. Importa o repositório em **vercel.com → Add New → Project**.
2. Em **Settings → Environment Variables**, adiciona `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tipo *Config*) e `GEMINI_API_KEY` (tipo *Secret*), todas no ambiente *Production*.
3. Faz deploy. A seguir, junta o domínio `.vercel.app` ao **Site URL** e às **Redirect URLs** do Supabase.

Cada push para `main` faz um deploy novo.

## Geração de cards com IA

- O PDF é enviado diretamente ao Gemini, que também lê tabelas e imagens. Não fica guardado na app nem no Supabase.
- A resposta segue um JSON Schema (`{ cards: [{ front, back }] }`) e é validada no servidor antes de chegar ao ecrã.
- O texto do PDF é tratado como material de estudo: o prompt manda ignorar qualquer instrução que venha dentro do documento.
- **Plano gratuito:** tem limites de pedidos por minuto e por dia. Quando são atingidos, a app avisa para tentar mais tarde. Nesse plano, o Google pode usar o conteúdo enviado para melhorar os modelos, por isso evita PDFs com dados pessoais.
- **Limites:** PDF até 4 MB (a Vercel limita os pedidos a 4,5 MB) e até 60 s por geração.
- Como a chave é partilhada por todos os utilizadores da instância, numa demo pública a quota gratuita pode esgotar-se.

## Estrutura

```
src/
├── app/
│   ├── login/                 # Entrar / Criar conta
│   ├── auth/confirm/          # Destino do link de confirmação de email
│   └── (app)/                 # Área autenticada (layout com cabeçalho)
│       ├── decks/             # Lista de decks
│       ├── decks/[id]/        # Cards de um deck
│       ├── decks/[id]/generate/ # Gerar cards de um PDF com IA
│       └── review/[deckId]/   # Sessão de revisão
├── components/ui/             # Button, Input, Textarea
├── lib/
│   ├── supabase/              # Clientes browser/servidor e refresh de sessão
│   ├── fsrs.ts                # Ponte entre a tabela cards e o ts-fsrs
│   ├── gemini.ts              # PDF → cards com o Gemini
│   ├── cards.ts               # Validação de frente/verso
│   └── format.ts              # Intervalos legíveis ("10 min", "4 d")
├── types/database.ts
└── proxy.ts                   # Refresh de sessão + proteção de rotas
supabase/migrations/           # Esquema SQL com RLS
```

### Modelo de dados

- **decks**: `id`, `user_id`, `name`, `created_at`
- **cards**: `id`, `deck_id`, `front`, `back`, os campos de estado do FSRS (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review`) e `created_at`
- **reviews**: `id`, `card_id`, `rating` (1–4), `reviewed_at`, `state_before`, `state_after` (snapshots em JSON)

Todas as tabelas têm RLS. O acesso a `cards` e `reviews` é validado pelo dono do deck. O histórico de `reviews` só aceita leitura e inserção.

## Roadmap

- [x] **Fase 1:** base: autenticação, decks, cards e revisão com FSRS
- [x] **Fase 2:** upload de PDF e geração automática de cards por IA
- [ ] **Fase 3:** respostas abertas corrigidas por IA

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |
