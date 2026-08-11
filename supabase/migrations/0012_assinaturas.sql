-- =============================================================================
-- Viral Farm — assinatura e ciclo de cobrança
--
-- O perfil já tinha `plano` (texto, default 'gratuito'). Faltava o RESTO da
-- assinatura: quem é essa pessoa no Stripe, até quando o plano vale, e em
-- que dia o contador de análises zera.
--
-- POR QUE O CICLO É UMA COLUNA E NÃO "MÊS CALENDÁRIO"
--
-- Quem assina dia 20 tem direito a 30 análises até o dia 20 seguinte, não
-- até o dia 1º. Contar por mês calendário daria menos do que foi vendido no
-- primeiro ciclo e resetaria no meio do período pago — o tipo de erro que a
-- pessoa percebe na fatura e não perdoa.
--
-- `ciclo_inicio` é o começo do período vigente; o contador de uso conta as
-- análises criadas de lá pra cá. O Stripe manda a data a cada renovação.
-- =============================================================================

alter table public.perfis
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  -- 'ativa' | 'cancelada' | 'inadimplente' | 'nenhuma'. Texto livre pelo
  -- mesmo motivo de `plano`: estado novo do provedor não pode exigir
  -- migração de schema num sábado.
  add column if not exists assinatura_status      text not null default 'nenhuma',
  add column if not exists ciclo_inicio           timestamptz,
  add column if not exists ciclo_fim              timestamptz;

-- O webhook do Stripe chega com o customer, não com o id do usuário: sem
-- este índice, toda renovação varreria a tabela inteira.
create unique index if not exists perfis_stripe_customer
  on public.perfis (stripe_customer_id)
  where stripe_customer_id is not null;

-- Contar "análises do ciclo" é a consulta mais quente do sistema depois da
-- fila: acontece em TODA tentativa de criar análise.
create index if not exists analises_dono_criado
  on public.analises (user_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- O dono LÊ o próprio plano, mas não escreve.
--
-- As políticas antigas deixavam o dono dar update no próprio perfil — o que
-- era inofensivo quando só existia `nome`, e virou um buraco agora: com
-- `plano` na mesma tabela, qualquer pessoa poderia se promover a Estúdio
-- direto pelo cliente, que carrega a chave anônima.
--
-- Agora o update do cliente é limitado a `nome`, e plano/assinatura só mudam
-- pela chave de serviço (webhook do Stripe), que ignora RLS.
-- ---------------------------------------------------------------------------
drop policy if exists "dono edita o proprio perfil" on public.perfis;

create policy "dono edita o proprio nome"
  on public.perfis for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.travar_campos_de_plano()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() é nulo quando a chamada vem da chave de serviço (webhook).
  -- Só nesse caso os campos de cobrança podem mudar.
  if (select auth.uid()) is not null then
    new.plano                  := old.plano;
    new.assinatura_status      := old.assinatura_status;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.ciclo_inicio           := old.ciclo_inicio;
    new.ciclo_fim              := old.ciclo_fim;
  end if;
  return new;
end;
$$;

drop trigger if exists perfis_travar_plano on public.perfis;
create trigger perfis_travar_plano
  before update on public.perfis
  for each row execute function public.travar_campos_de_plano();

notify pgrst, 'reload schema';
