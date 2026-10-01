# Flashcards

Web app de flashcards com **repetição espaçada**. Crias decks e cards, e o algoritmo **FSRS** decide quando deves rever cada card. Assim, o tempo de estudo vai para o que estás prestes a esquecer.

Este é um projeto de portfólio, pensado primeiro para o celular. A IA gera cards a partir de PDFs, texto ou fotos e corrige respostas escritas.

## Funcionalidades

- Conta com email e palavra-passe (Supabase Auth), com confirmação por email e recuperação de palavra-passe
- Login com Google (opcional): o botão aparece sozinho quando o fornecedor é ligado no Supabase
- Rotas protegidas: sem sessão, qualquer página redireciona para o login
- Decks: criar, mudar o nome e apagar
- Cards: criar, editar e apagar, com frente e verso
- Revisão: mostra só os cards com `due <= agora`. Revelas a resposta e avalias com **Errei / Difícil / Bom / Fácil**. Cada botão mostra quando o card volta (ex.: "Bom · 10 min"). O próximo agendamento é calculado no servidor com o [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs)
- Rever todos os decks de uma vez, pela ordem em que os cards venceram
- **Respostas escritas corrigidas por IA:** escreves a resposta, a IA diz se está certa, quase certa ou errada e sugere a avaliação. A decisão final é tua
- Histórico de revisões, com o estado do card antes e depois de cada resposta
- **Estatísticas:** dias seguidos de estudo, revisões por dia, taxa de acerto e cards a vencer nos próximos dias
- Importar cards de CSV, de uma folha de cálculo ou do Anki, e exportar um deck em CSV
- Segurança com Row Level Security: cada utilizador só acede aos próprios dados
- UI mobile-first, com tema claro/escuro e botões ao alcance do polegar
- **PWA:** instala-se no ecrã principal, mostra uma página própria quando não há rede e envia um lembrete diário por notificação a quem tem cards para rever
- **Cards gerados por IA:** a partir de um PDF (até 15 MB), de texto colado ou de fotos de apontamentos, o Google Gemini sugere até 10, 20 ou 30 cards. Revês, editas ou descartas cada um antes de guardar
- Limite diário de pedidos à IA por utilizador, para uma só conta não gastar a quota partilhada
- Registo de erros numa tabela própria (os logs da Vercel no plano gratuito duram uma hora)

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions) + TypeScript |
| Estilo | [Tailwind CSS 4](https://tailwindcss.com) |
| Auth e base de dados | [Supabase](https://supabase.com) (Postgres + Auth) via `@supabase/ssr` |
| Agendamento | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (FSRS) |
| IA | [Google Gemini](https://ai.google.dev) via `@google/genai` (plano gratuito) |
| Notificações | [web-push](https://github.com/web-push-libs/web-push) + service worker |
| Testes | [Vitest](https://vitest.dev) + GitHub Actions |
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
   - `GEMINI_MODEL` (opcional): por padrão `gemini-flash-lite-latest`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `CRON_SECRET` (opcionais): só para os lembretes. Ver [Lembretes por notificação](#lembretes-por-notificação)
3. **Criar as tabelas e o armazenamento.** No Supabase, abre **SQL Editor** e corre, por esta ordem, o conteúdo de:
   - [`supabase/migrations/20261001000000_init.sql`](supabase/migrations/20261001000000_init.sql): tabelas e RLS
   - [`supabase/migrations/20261001120000_pdf_storage.sql`](supabase/migrations/20261001120000_pdf_storage.sql): bucket privado `pdfs` para os uploads
   - [`supabase/migrations/20261002000000_melhorias.sql`](supabase/migrations/20261002000000_melhorias.sql): limite de uso da IA, registo de erros e subscrições de notificações

   Se usares a [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase db push` faz o mesmo.
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

**Recuperação de palavra-passe.** Funciona sem configuração: o link do email abre `/auth/recovery`, que inicia a sessão e pede a nova palavra-passe. Com o template padrão (PKCE), o link tem de ser aberto no navegador onde foi pedido. Para funcionar em qualquer dispositivo, muda o link em **Authentication → Emails → Reset password** para:

```html
<a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery">Definir nova palavra-passe</a>
```

**Login com Google (opcional).** Cria um cliente OAuth na [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (tipo *Web application*) com o redirect URI `https://<projeto>.supabase.co/auth/v1/callback`. Depois, em **Authentication → Sign In / Providers → Google**, liga o fornecedor e cola o *Client ID* e o *Client Secret*. O botão "Continuar com o Google" aparece no login em poucos minutos, sem novo deploy.

## Deploy na Vercel

1. Importa o repositório em **vercel.com → Add New → Project**.
2. Em **Settings → Environment Variables**, adiciona `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tipo *Config*) e `GEMINI_API_KEY` (tipo *Secret*), todas no ambiente *Production*. Para os lembretes, junta as três variáveis descritas em [Lembretes por notificação](#lembretes-por-notificação).
3. Faz deploy. A seguir, junta o domínio `.vercel.app` ao **Site URL** e às **Redirect URLs** do Supabase.

Cada push para `main` faz um deploy novo.

## Lembretes por notificação

Em **Conta → Lembretes**, cada dispositivo pode ativar um lembrete diário. Um [cron da Vercel](https://vercel.com/docs/cron-jobs) (ver `vercel.json`) chama `/api/cron/reminders` todos os dias às 18:00 UTC e envia uma notificação push a quem tem cards para rever. No iPhone, as notificações só funcionam com a app instalada no ecrã principal.

Configuração rápida: `npm run setup:reminders` gera as três variáveis e o SQL do passo 3, prontos a colar. À mão:

1. Gera as chaves VAPID com `npx web-push generate-vapid-keys` e guarda-as em `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.
2. Define `CRON_SECRET` com um valor aleatório longo (por exemplo, `openssl rand -hex 32`). A Vercel envia-o ao chamar o cron.
3. O cron não tem sessão de utilizador, por isso lê as subscrições através de funções SQL que exigem o mesmo segredo. Na base de dados fica só o SHA-256 dele. No **SQL Editor** do Supabase, corre (com o teu valor de `CRON_SECRET`):
   ```sql
   insert into app_private.settings (key, value)
   values ('cron_secret_sha256', encode(sha256(convert_to('<CRON_SECRET>', 'UTF8')), 'hex'))
   on conflict (key) do update set value = excluded.value;
   ```

Sem estas variáveis, a app funciona na mesma e a secção de lembretes indica que não estão configurados.

## IA

- **Modelos:** por padrão usa-se o `gemini-flash-lite-latest`, que no plano gratuito é o que responde de forma fiável, e o `gemini-flash-latest` como reserva. Cada pedido tem um limite de tempo e, se o modelo principal falhar ou ficar sem quota, a app passa ao de reserva.
- **Origens:** PDF, texto colado (até 30 000 caracteres) ou até 4 fotos, que o navegador reduz antes do envio.
- **Respostas escritas:** na revisão, a opção "Escrever a resposta e corrigir com IA" envia a pergunta, a resposta de referência e a tua resposta. A IA classifica-a (certo, quase, errado) e sugere uma avaliação, mas és tu quem carrega no botão. Se a IA falhar, a resposta é mostrada e avalias como sempre.
- **Limites por utilizador:** 10 gerações e 100 correções em cada 24 horas (ver `src/lib/ai-usage.ts`). O uso aparece em **Conta**.
- **Percurso do PDF:**
  1. O navegador envia-o diretamente para um bucket privado do Supabase Storage (`pdfs/<user_id>/…`). Assim não passa pela Vercel, que limita os pedidos a 4,5 MB.
  2. O servidor descarrega-o e envia-o à [Files API](https://ai.google.dev/gemini-api/docs/files) do Gemini, que também lê tabelas e imagens.
  3. No fim, o ficheiro é apagado do Storage e do Gemini, com ou sem erro.
- A resposta segue um JSON Schema (`{ cards: [{ front, back }] }`) e é validada no servidor antes de chegar ao ecrã.
- O texto do PDF é tratado como material de estudo: o prompt manda ignorar qualquer instrução que venha dentro do documento.
- **Plano gratuito:** tem limites de pedidos por minuto e por dia. Quando são atingidos, a app avisa para tentar mais tarde. Nesse plano, o Google pode usar o conteúdo enviado para melhorar os modelos, por isso evita PDFs com dados pessoais.
- **Limites:** PDF até 15 MB (validado no navegador, no bucket e no servidor) e até 120 s por geração.
- A chave é partilhada por todos os utilizadores da instância. O limite por utilizador protege a quota gratuita, mas numa demo pública com muitas contas ela pode esgotar-se na mesma.

## Importar e exportar

- **Importar** (`/decks/<id>/import`): cola texto ou escolhe um ficheiro `.csv`, `.tsv` ou `.txt`. A primeira coluna é a frente e a segunda o verso. O separador (vírgula, ponto e vírgula ou tabulação) é detetado sozinho. Funciona com a exportação "Notas em texto simples" do Anki. Revês os cards antes de guardar, até 500 de cada vez.
- **Exportar:** o botão "Exportar CSV" de cada deck descarrega um ficheiro que o Excel, o Google Sheets e o Anki abrem.

## Registo de erros

Os erros da IA e os erros inesperados dos ecrãs ficam na tabela `error_logs`, com o utilizador, a página e a mensagem. A app só escreve nessa tabela; para ler, usa o **Table Editor** do Supabase.

## Testes

- `npm test` corre os testes unitários (Vitest): agendamento FSRS, validação de cards, leitura de CSV e cálculo das estatísticas.
- O GitHub Actions (`.github/workflows/ci.yml`) corre lint, verificação de tipos, testes e build em cada push e pull request.

## Estrutura

```
src/
├── app/
│   ├── login/                 # Entrar / Criar conta / Recuperar palavra-passe
│   ├── auth/                  # Destinos dos links de email e do login com Google
│   ├── offline/               # Página mostrada quando não há rede
│   ├── api/cron/reminders/    # Lembrete diário (cron da Vercel)
│   └── (app)/                 # Área autenticada (layout com cabeçalho)
│       ├── decks/             # Lista de decks
│       ├── decks/[id]/        # Cards de um deck, importar e exportar
│       ├── decks/[id]/generate/ # Gerar cards com IA (PDF, texto, fotos)
│       ├── review/            # Sessão de revisão: um deck ou todos
│       ├── stats/             # Estatísticas
│       └── account/           # Palavra-passe, lembretes e uso da IA
├── components/                # Button, Input, Textarea, registo do service worker
├── lib/
│   ├── supabase/              # Clientes browser/servidor e refresh de sessão
│   ├── fsrs.ts                # Ponte entre a tabela cards e o ts-fsrs
│   ├── gemini.ts              # Gerar cards e corrigir respostas com o Gemini
│   ├── ai-usage.ts            # Limite diário de pedidos à IA
│   ├── csv.ts                 # Importar e exportar cards
│   ├── stats.ts               # Sequência de dias, revisões por dia, previsão
│   ├── push.ts                # Envio de notificações push
│   ├── log.ts                 # Registo de erros
│   ├── cards.ts               # Validação de frente/verso
│   └── format.ts              # Intervalos legíveis ("10 min", "4 d")
├── types/database.ts
└── proxy.ts                   # Refresh de sessão + proteção de rotas
public/sw.js                   # Service worker: página sem rede e notificações
supabase/migrations/           # Esquema SQL com RLS
```

### Modelo de dados

- **decks**: `id`, `user_id`, `name`, `created_at`
- **cards**: `id`, `deck_id`, `front`, `back`, os campos de estado do FSRS (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review`) e `created_at`
- **reviews**: `id`, `card_id`, `rating` (1–4), `reviewed_at`, `state_before`, `state_after` (snapshots em JSON)

- **ai_usage**: uma linha por pedido à IA (`user_id`, `kind`, `created_at`), para o limite diário
- **push_subscriptions**: uma subscrição de notificações por dispositivo
- **error_logs**: erros registados pela app

Todas as tabelas têm RLS. O acesso a `cards` e `reviews` é validado pelo dono do deck. O histórico de `reviews` e o de `ai_usage` só aceitam leitura e inserção, e `error_logs` só aceita inserção.

## Roadmap

- [x] **Fase 1:** base: autenticação, decks, cards e revisão com FSRS
- [x] **Fase 2:** upload de PDF e geração automática de cards por IA
- [x] **Fase 3:** respostas abertas corrigidas por IA, estatísticas, importação/exportação, PWA com lembretes, testes e CI

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos das rotas e corre o TypeScript |
| `npm test` | Testes unitários (Vitest) |
