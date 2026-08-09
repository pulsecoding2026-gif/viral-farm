-- =============================================================================
-- Viral Farm — aba Planejar (Agent Viral, Roteiros, Hooks)
--
-- Uma tabela só pros três módulos, com o conteúdo em jsonb.
--
-- Os três guardam coisas de formato diferente (conversa com mensagens,
-- roteiro com blocos, lista de hooks) mas o CICLO é idêntico: o dono cria,
-- lista o histórico, abre um item, apaga. Três tabelas repetiriam RLS e
-- índice em troca de nenhuma consulta nova — ninguém filtra "roteiros por
-- duração" no banco; quem interpreta o jsonb é a aplicação.
--
-- `titulo` existe fora do jsonb porque é a ÚNICA coisa que a listagem
-- mostra: extrair título de estruturas diferentes por tipo empurraria um
-- switch pra cada tela de histórico.
-- =============================================================================

create table if not exists public.planejamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('agente', 'roteiro', 'hooks')),
  titulo text not null default '',
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- A listagem é sempre "meus itens deste tipo, mais recentes primeiro".
create index if not exists planejamentos_dono_tipo
  on public.planejamentos (user_id, tipo, atualizado_em desc);

alter table public.planejamentos enable row level security;

create policy "dono le planejamento" on public.planejamentos
  for select using (auth.uid() = user_id);
create policy "dono cria planejamento" on public.planejamentos
  for insert with check (auth.uid() = user_id);
-- Update existe por causa do chat: cada mensagem nova reescreve a conversa.
create policy "dono atualiza planejamento" on public.planejamentos
  for update using (auth.uid() = user_id);
create policy "dono apaga planejamento" on public.planejamentos
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
