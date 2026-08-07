-- =============================================================================
-- Viral Farm — proxy leve pra edição no navegador
--
-- O editor não-destrutivo precisa do vídeo FONTE no navegador: sem ele não dá
-- pra esticar um corte pra antes de onde ele começa, porque o material não
-- está lá. E o fonte vive só na VPS, que não expõe HTTP.
--
-- A solução é a mesma do Premiere e do DaVinci: editar sobre um proxy leve
-- (480p) e renderizar sobre o original em alta. Esta coluna guarda a URL
-- pública do proxy no Storage.
-- =============================================================================

alter table public.analises add column if not exists proxy_url text;

notify pgrst, 'reload schema';
