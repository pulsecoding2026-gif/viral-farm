-- =============================================================================
-- Viral Farm — cancelar análise em andamento
--
-- Sem isto, colar o link errado ou escolher a opção errada custava esperar o
-- pipeline inteiro terminar, queimando processamento e crédito à toa.
--
-- 'cancelado' é status próprio e não 'erro': o dono mandou parar, nada
-- falhou. Guardar como erro mentiria no banco e pintaria de vermelho uma
-- tela de quem acabou de clicar em cancelar.
-- =============================================================================

alter table public.analises drop constraint analises_status_check;
alter table public.analises add constraint analises_status_check
  check (status in ('processando', 'revisao', 'pronto', 'erro', 'cancelado'));

-- Sem isso o PostgREST segue servindo o schema antigo e todo update que use
-- o valor novo falha com violação de constraint.
notify pgrst, 'reload schema';
