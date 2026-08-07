-- =============================================================================
-- Viral Farm — estrutura inicial
--
-- Quatro tabelas, todas com RLS ligada e regra única: cada usuário só enxerga
-- e mexe no que é dele. A service_role (só servidor) ignora RLS por design.
--
--   perfis    espelho público de auth.users (nome, plano) + trigger de criação
--   analises  os jobs do Analisador (hoje em data/analises.json)
--   colecoes  agrupamentos da Biblioteca (hoje em data/colecoes.json)
--   salvos    ativos guardados — vídeo do Radar ou análise (data/salvos.json)
-- =============================================================================

-- ---------------------------------------------------------------- perfis ----
create table public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null default '',
  -- 'gratuito' | 'lite' | 'creator' | 'viral' — texto livre de propósito:
  -- plano novo não pode exigir migração de schema.
  plano     text not null default 'gratuito',
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "dono le o proprio perfil"
  on public.perfis for select using ((select auth.uid()) = id);
create policy "dono edita o proprio perfil"
  on public.perfis for update using ((select auth.uid()) = id);

-- Cria o perfil junto com a conta. SECURITY DEFINER porque o signup roda sem
-- sessão; search_path vazio blinda contra sombreamento de schema.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute procedure public.criar_perfil();

-- -------------------------------------------------------------- analises ----
create table public.analises (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  link      text not null,
  nicho     text not null default '',
  -- Espelha o union de src/lib/jobs.ts: processando -> pronto | erro.
  status    text not null default 'processando'
            check (status in ('processando', 'pronto', 'erro')),
  -- Etapa atual enquanto processando (validando, baixando, lendo...).
  etapa     text,
  -- SaidaDoPipeline inteira. JSONB porque o formato evolui com o prompt —
  -- coluna por campo viraria migração a cada ajuste de IA.
  resultado jsonb,
  -- Mensagem de erro quando status = 'erro'.
  mensagem  text,
  criado_em timestamptz not null default now()
);

create index analises_por_usuario on public.analises (user_id, criado_em desc);

alter table public.analises enable row level security;

create policy "dono le as proprias analises"
  on public.analises for select using ((select auth.uid()) = user_id);
create policy "dono cria analise propria"
  on public.analises for insert with check ((select auth.uid()) = user_id);
create policy "dono atualiza analise propria"
  on public.analises for update using ((select auth.uid()) = user_id);
create policy "dono apaga analise propria"
  on public.analises for delete using ((select auth.uid()) = user_id);

-- -------------------------------------------------------------- colecoes ----
create table public.colecoes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  nome      text not null,
  -- O propósito: o que o usuário quer fazer com esse material.
  nota      text,
  emoji     text not null default '💡',
  criada_em timestamptz not null default now()
);

create index colecoes_por_usuario on public.colecoes (user_id, criada_em desc);

alter table public.colecoes enable row level security;

create policy "dono le as proprias colecoes"
  on public.colecoes for select using ((select auth.uid()) = user_id);
create policy "dono cria colecao propria"
  on public.colecoes for insert with check ((select auth.uid()) = user_id);
create policy "dono atualiza colecao propria"
  on public.colecoes for update using ((select auth.uid()) = user_id);
create policy "dono apaga colecao propria"
  on public.colecoes for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- salvos ----
create table public.salvos (
  -- Reaproveita o id de origem (item do Radar ou job de análise) — é o que
  -- deixa o botão "salvar" ser alternador sem consulta extra. TEXT, não uuid:
  -- ids do Radar vêm de fora e não são uuid.
  id         text not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  tipo       text not null check (tipo in ('video', 'analise')),
  nota       text,
  -- Apagar a coleção NÃO apaga o ativo: ele volta pro acervo (set null) —
  -- mesma regra do removerColecao() de src/lib/salvos.ts.
  colecao_id uuid references public.colecoes (id) on delete set null,
  -- video: ItemBiblioteca | analise: { titulo, nicho, link, qtd_roteiros }
  dados      jsonb not null,
  salvo_em   timestamptz not null default now(),
  -- O mesmo ativo pode ser salvo por usuários diferentes.
  primary key (user_id, id)
);

create index salvos_por_usuario on public.salvos (user_id, salvo_em desc);
create index salvos_por_colecao on public.salvos (colecao_id);

alter table public.salvos enable row level security;

create policy "dono le os proprios salvos"
  on public.salvos for select using ((select auth.uid()) = user_id);
create policy "dono salva ativo proprio"
  on public.salvos for insert with check ((select auth.uid()) = user_id);
create policy "dono atualiza salvo proprio"
  on public.salvos for update using ((select auth.uid()) = user_id);
create policy "dono remove salvo proprio"
  on public.salvos for delete using ((select auth.uid()) = user_id);
