-- =============================================================================
-- Viral Farm — palavras de destaque da legenda
--
-- O destaque era detectado por regex (/\d/): só número virava colorido. Os
-- presets pedem coisas semânticas ("vermelho em dor e perda", "amarelo no
-- número que prova"), que regex nenhum resolve — quem lê a transcrição
-- inteira é a IA, então é ela que marca.
--
-- Guardado por CORTE porque a reedição (trocar formato, ajustar tempo)
-- re-renderiza a partir do banco: sem a coluna, o corte reeditado perderia
-- o destaque e sairia diferente do original.
-- =============================================================================

alter table public.cortes add column if not exists destaques jsonb;

notify pgrst, 'reload schema';
