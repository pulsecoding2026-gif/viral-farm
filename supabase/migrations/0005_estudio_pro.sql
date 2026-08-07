-- =============================================================================
-- Viral Farm — Estúdio Pro
--
-- O corte deixa de ser "uma nota e um vídeo" e passa a carregar o diagnóstico
-- de por que foi escolhido, além do texto que aparece na tela.
-- =============================================================================

-- Diagnóstico do score: { gancho, fluxo, valor, tendencia } de 0 a 100 cada.
-- JSONB e não colunas porque as dimensões vão mudar conforme refinarmos o
-- prompt — cada ajuste viraria uma migração.
alter table public.cortes add column notas jsonb;

-- Título que aparece na tela nos primeiros segundos do corte. Diferente do
-- `titulo`, que é o nome do card: este é curto e feito pra ser LIDO no vídeo.
alter table public.cortes add column titulo_tela text;

-- Legenda pronta pra postar (caption). O corte entrega o vídeo E o texto.
alter table public.cortes add column descricao text;
