-- =============================================================================
-- Viral Farm — projeto de edição por corte
--
-- Até aqui editar um corte era "ajusta início/fim, troca o estilo e re-renderiza
-- tudo" — cada ajuste virava minutos de ffmpeg numa VPS de um núcleo. Agora cada
-- corte carrega um PROJETO (src/lib/editor/projeto.ts): trilhas, itens,
-- enquadramento, keyframes e efeitos, tudo em número. Nenhum gesto da interface
-- produz vídeo; o render acontece uma vez, no fim, lendo daqui.
--
-- Guardado NO CORTE e não numa tabela de trilhas/itens porque o projeto é um só
-- por corte e nunca é lido pela metade: normalizar exigiria join e transação a
-- cada clipe arrastado, sem habilitar consulta nenhuma que a gente vá fazer.
--
-- Nulo = corte que nunca foi aberto no editor. O worker segue pela receita
-- antiga (início/fim + estilo) nesse caso, então os cortes já existentes não
-- mudam de comportamento.
-- =============================================================================

alter table public.cortes add column if not exists projeto jsonb;

-- Sem isso o PostgREST continua servindo o schema antigo e todo select/update
-- que cite a coluna nova falha com "column does not exist".
notify pgrst, 'reload schema';
