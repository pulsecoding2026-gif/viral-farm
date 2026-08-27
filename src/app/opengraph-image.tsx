import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MARCA } from "@/lib/gta/marca";

/**
 * A ARTE QUE APARECE QUANDO ALGUÉM COLA O LINK.
 *
 * Num nicho de games, metade do tráfego chega por link colado em grupo de
 * WhatsApp, thread do X e canal do Discord — e nenhum desses três mostra o
 * site: mostram este PNG, o título e a descrição. É a única peça de design do
 * projeto que a pessoa vê ANTES de decidir se clica.
 *
 * NÃO USA NADA DA ROCKSTAR. Nem arte, nem lettering, nem paleta do material
 * oficial: só o logo do próprio produto e as cores da marca em
 * `gta-tokens.css`. Uma imagem de compartilhamento que parece oficial é
 * exatamente o que transforma "projeto de fã" em problema jurídico — e o
 * rodapé da própria imagem diz que não é oficial.
 *
 * COMO ESTE ARQUIVO VIRA IMAGEM: `opengraph-image.tsx` é uma convenção de
 * arquivo do Next. O JSX abaixo NÃO é React no navegador — vai para o Satori,
 * que aceita só um subconjunto de CSS (flexbox sim, grid não) e exige
 * `display: flex` explícito em toda div com mais de um filho. Ver
 * `node_modules/next/dist/docs/.../opengraph-image.md`.
 *
 * O Next injeta `og:image`, `og:image:width`, `og:image:height` e
 * `og:image:alt` sozinho a partir dos exports daqui — por isso `layout.tsx`
 * não declara imagem no objeto `openGraph`. Declarar nos dois lugares geraria
 * duas tags e o WhatsApp escolheria uma.
 */

/* 1200x630 é a medida canônica do Open Graph e a que o X pede para o card
   grande. Não é escolha estética: fora dela o Facebook recorta pelo centro. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${MARCA} — cortes de GTA VI com IA, projeto de fã não oficial`;

/* O gradiente do símbolo: ouro no topo, magenta na água. Os mesmos três stops
   de `public/gta-viral.svg`, para a faixa da imagem ser literalmente a mesma
   cor do logo que está logo acima dela. */
const SOL = "linear-gradient(90deg, #ff3d9a 0%, #f95d1e 55%, #ffc247 100%)";

export default async function Image() {
  /*
   * O logo é lido do disco EM TEMPO DE GERAÇÃO, não importado.
   *
   * `import logo from "..."` empacotaria os 773 KB do PNG no bundle da rota, e
   * o Satori tem teto de 500 KB para o pacote inteiro (JSX + CSS + fontes +
   * imagens). Lido por `readFile`, o arquivo nunca entra no bundle: ele é
   * decodificado durante a geração e o que sobra no deploy é só o PNG final.
   *
   * `process.cwd()` é a raiz do projeto — é o que a documentação do Next usa
   * para asset local, e o caminho é relativo a ela, não a este arquivo.
   */
  const logo = await readFile(
    join(process.cwd(), "public", "logo-gta-viral-v3.png"),
    "base64",
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // GTA Black — o mesmo `--fundo-poco` do site, não um preto qualquer.
          backgroundColor: "#080808",
          padding: "64px 72px",
          // A fonte padrão do Satori é a Geist, que já é uma das famílias
          // carregadas em `layout.tsx`. Carregar Archivo ou Bebas aqui exigiria
          // um .ttf no repositório (o `next/font` guarda .woff2, que o Satori
          // não lê) — a hierarquia vem do tamanho e do tracking, que é
          // exatamente como o brandbook constrói rótulo em caixa alta.
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/*
          O brilho de Vice City no canto — um retângulo borrado, não um
          radial-gradient: o Satori suporta `filter: blur`, e assim o efeito
          fica previsível em vez de depender do suporte a gradiente radial.
          Fica ATRÁS de tudo e bem fraco: a arte tem que ler em 400px de
          largura na pré-visualização do WhatsApp, e brilho forte vira mancha.
        */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 620,
            backgroundColor: "#785fd0",
            opacity: 0.22,
            filter: "blur(150px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: 560,
            backgroundColor: "#ee4f9c",
            opacity: 0.16,
            filter: "blur(150px)",
            display: "flex",
          }}
        />

        {/* -------------------------------------------------- marca + promessa */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- isto roda no
              Satori (gerador de PNG), onde next/image não existe. */}
          <img
            src={`data:image/png;base64,${logo}`}
            alt=""
            /*
             * 1774x887 é 2:1 exato — 360x180 preserva a proporção do lockup.
             * Errar aqui esticaria o letreiro, que é o pecado mais visível que
             * uma imagem de marca pode cometer.
             *
             * Era 400x200 e desceu: com o logo maior, a soma de logo +
             * headline + subtítulo + rodapé passava de 618px numa arte de 630,
             * e o `space-between` não tinha folga nenhuma para distribuir — a
             * faixa de gradiente encostava no subtítulo. Não dava erro; só
             * ficava apertado, que é o defeito que ninguém vê no código.
             */
            style={{ width: 360, height: 180, marginLeft: -12 }}
          />

          {/*
            A PROMESSA EM DUAS LINHAS, no imperativo.
            É a mesma frase que a home usa no hero ("cole o link da live e
            receba os Shorts prontos") reduzida ao osso. Imagem de
            compartilhamento é lida em um segundo e meio, de relance, no meio de
            uma conversa: se precisar de três linhas, já perdeu.
          */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 30,
              fontSize: 58,
              lineHeight: 1.12,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            <span>Cole o link da live.</span>
            {/*
              SEM `display: flex` neste span, de propósito.
              Como flex, cada nó vira uma caixa e o ponto final ganhava uma
              folga visível depois de "prontos". Em fluxo inline o Satori
              encosta os três nós — que é como texto se comporta.
            */}
            <span>
              {/*
                ESPAÇO INQUEBRÁVEL (\u00A0), e não um espaço comum.
                O Satori normaliza o espaço no fim de um nó de texto e o
                descarta — tanto o `{" "}` solto entre elementos quanto o
                `"Receba os "` com espaço no fim saíram como "Receba osShorts"
                na imagem gerada, sem erro nenhum no console. O \u00A0 não é
                espaço normalizável, então sobrevive.
              */}
              {"Receba os\u00A0"}
              {/* O rosa aparece UMA vez, onde está o soco da frase — a mesma
                  regra de `acento-rosa` no hero da home. */}
              {/*
                O PONTO FINAL VAI DENTRO DO SPAN ROSA, e isso é conserto, não
                capricho: como nó irmão separado, o Satori inseria uma folga
                entre "prontos" e o ponto — em fluxo inline ou em flex, nos
                dois. Um ponto rosa de 58px é imperceptível; um ponto solto
                flutuando depois da palavra, não.
              */}
              <span style={{ color: "#fa7fb8" }}>Shorts prontos.</span>
            </span>
          </div>

          {/* --texto-2 (#c7c7c7): secundário de verdade, sem sumir no preto. */}
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 26,
              color: "#c7c7c7",
            }}
          >
            Cortes verticais de GTA com IA — sem gravar, sem aparecer.
          </div>
        </div>

        {/* ------------------------------------------------------------ rodapé */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* A linha de horizonte com o gradiente do logo: o detalhe mais barato
              que amarra a imagem à marca — o mesmo `<hr className="horizonte">`
              que separa as seções da home. */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 5,
              borderRadius: 5,
              backgroundImage: SOL,
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 26,
              fontSize: 21,
              // Caixa alta com tracking positivo: a receita de rótulo do
              // brandbook, que é o papel que a Bebas cumpre no site.
              textTransform: "uppercase",
              letterSpacing: "0.16em",
            }}
          >
            <span style={{ color: "#858585" }}>Twitch · Kick · YouTube</span>
            {/*
              O AVISO DE NÃO-OFICIAL DENTRO DA ARTE, e não só no rodapé do site.
              Esta imagem circula SOZINHA — ela é o que se vê no WhatsApp sem
              nunca abrir a página. Se o disclaimer só existe no HTML, ele não
              existe para quem só viu o card.
            */}
            <span style={{ color: "#858585" }}>Projeto de fã · não oficial</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
