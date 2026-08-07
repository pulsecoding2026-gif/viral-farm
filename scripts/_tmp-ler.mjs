import { FORMATOS } from "./_tmp-formatos.mjs";
for (const f of FORMATOS.slice(0, 6)) {
  const l = f.legenda;
  console.log(`\n=== ${f.nome} (${f.id})`);
  console.log(`  pos=${l.posicao} tam=${l.tamanhoPct}% align=${l.alinhamento}`);
  console.log(`  fonte=${l.fonte} peso=${l.peso} caixa=${l.caixa}`);
  console.log(`  cor=${l.cor} stroke=${l.stroke} sombra=${l.sombra} fundo=${l.fundo}`);
  console.log(`  linhas=${l.maxLinhas} chars=${l.maxCaracteresLinha} espac=${l.espacamentoLinha}`);
  console.log(`  safe: lat=${l.margemLateralPct} topo=${l.safeAreaTopoPct} base=${l.safeAreaBasePct} dir=${l.safeAreaDireitaPct}`);
  console.log(`  anim=${l.animacao}`);
  console.log(`  destaque=${JSON.stringify(f.destaque.cores)}`);
  console.log(`  duracao=${f.duracaoIdeal.minSeg}-${f.duracaoIdeal.maxSeg}s (ideal ${f.duracaoIdeal.sweetSpotSeg})`);
}
