-- =============================================================================
-- Viral Farm — formato escolhido por corte
--
-- No modo automático a IA agora casa CADA corte com um dos formatos da galeria
-- (src/lib/formatos.ts) em vez de aplicar um estilo único ao vídeo inteiro. A
-- coluna `estilo` já guardava o id; falta guardar o PORQUÊ, que é o que o
-- Estúdio mostra pro dono entender a escolha.
-- =============================================================================

alter table public.cortes add column motivo_formato text;

-- Sem isso o PostgREST continua servindo o schema antigo e todo insert que
-- cite a coluna nova falha com "column does not exist".
notify pgrst, 'reload schema';
