-- =============================================================================
-- Viral Farm — cortes renderizados (o motor estilo Opus Clip)
--
-- Uma análise (tabela `analises`) passa a poder gerar CORTES: vídeos 9:16
-- renderizados pelo worker na VPS. Cada linha aqui é um MP4 no bucket.
--
-- Quem escreve é sempre o worker (service_role, ignora RLS). O usuário só lê.
-- =============================================================================

create table public.cortes (
  id         uuid primary key default gen_random_uuid(),
  analise_id uuid not null references public.analises (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Posição na lista (1 = melhor score).
  ordem      int not null,
  inicio_s   numeric not null,
  fim_s      numeric not null,
  titulo     text not null,
  -- A primeira frase falada — o que segura os 3 primeiros segundos.
  gancho     text,
  -- Por que o modelo escolheu este trecho. Vai pra UI: vender o corte.
  motivo     text,
  -- 0–100. Estimativa de adequação ao formato curto, não profecia de views.
  score      int,
  -- Caminho no bucket `cortes` quando status = 'pronto'.
  arquivo    text,
  status     text not null default 'renderizando'
             check (status in ('renderizando', 'pronto', 'erro')),
  criado_em  timestamptz not null default now()
);

create index cortes_por_analise on public.cortes (analise_id, ordem);
create index cortes_por_usuario on public.cortes (user_id, criado_em desc);

alter table public.cortes enable row level security;

create policy "dono le os proprios cortes"
  on public.cortes for select using ((select auth.uid()) = user_id);

-- Bucket dos MP4 renderizados. Público de propósito no MVP: o caminho leva
-- UUIDs não adivinháveis e o vídeo final é justamente feito pra ser postado.
insert into storage.buckets (id, name, public)
values ('cortes', 'cortes', true)
on conflict (id) do nothing;
