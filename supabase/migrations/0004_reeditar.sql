-- =============================================================================
-- Viral Farm — Reeditar corte
--
-- Um corte pronto pode voltar pra esteira com receita nova: outro estilo de
-- legenda e/ou início/fim ajustados. O MP4 novo sobrescreve o mesmo caminho
-- no bucket — o link não muda.
-- =============================================================================

-- Estilo POR CORTE. Nulo = herda o estilo escolhido no envio da análise.
alter table public.cortes add column estilo text;

-- Quando o MP4 atual foi renderizado. Vira o ?v= da URL pública: sem isso o
-- navegador serviria o vídeo antigo do cache depois de uma reedição.
alter table public.cortes add column renderizado_em timestamptz;
