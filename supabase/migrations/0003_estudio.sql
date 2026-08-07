-- =============================================================================
-- Viral Farm — o Estúdio (Clip AI)
--
-- O pipeline ganha uma parada no meio: a IA PROPÕE os cortes sem renderizar,
-- o usuário revisa no Estúdio e só o que ele aprova vira MP4. O modo
-- automático continua existindo — ele só aprova tudo sozinho.
-- =============================================================================

-- Análise agora pode estar "em revisão": propostas prontas, esperando o dono
-- decidir no Estúdio.
alter table public.analises drop constraint analises_status_check;
alter table public.analises add constraint analises_status_check
  check (status in ('processando', 'revisao', 'pronto', 'erro'));

-- Preferências do envio: { modo: 'auto'|'manual', qtd, duracao, direcao }
alter table public.analises add column opcoes jsonb not null default '{}';

-- Transcrição completa (idioma, texto, palavras com tempo) — é ela que
-- alimenta o Estúdio: prévia de cada corte e, depois, o ajuste fino.
alter table public.analises add column transcricao jsonb;

-- Corte nasce 'proposto' (sem arquivo). Aprovado vira fila de render;
-- descartado fica de fora mas não é apagado — o usuário pode voltar atrás.
alter table public.cortes drop constraint cortes_status_check;
alter table public.cortes add constraint cortes_status_check
  check (status in ('proposto', 'aprovado', 'descartado', 'renderizando', 'pronto', 'erro'));
alter table public.cortes alter column status set default 'proposto';

-- O dono precisa aprovar/descartar os próprios cortes pelo site.
create policy "dono atualiza corte proprio"
  on public.cortes for update using ((select auth.uid()) = user_id);
