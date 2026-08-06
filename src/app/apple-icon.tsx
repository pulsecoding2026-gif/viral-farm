import { ImageResponse } from "next/og";

/**
 * Ícone de tela inicial do iOS. Diferente do favicon, este precisa de fundo
 * opaco: o iOS não respeita transparência e colocaria a marca sobre branco.
 *
 * O símbolo entra como data URI porque o Satori (motor do ImageResponse)
 * renderiza SVG por <img>, não por elemento inline.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SIMBOLO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13.11 -7.98 152 152" width="104" height="104"><g transform="translate(0,136) scale(0.1,-0.1)" fill="#f74211"><path d="M135 1343 c-72 -37 -124 -114 -125 -184 0 -20 11 -55 25 -80 95 -167 125 -264 125 -404 0 -141 -24 -219 -126 -405 -28 -51 -30 -95 -9 -148 34 -80 108 -127 190 -120 45 4 92 28 371 188 175 101 380 218 454 261 143 81 179 116 202 190 9 32 8 46 -6 84 -26 68 -57 98 -154 152 -48 27 -240 137 -427 245 -187 107 -359 205 -382 217 -48 24 -95 26 -138 4z"/></g></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d13",
        }}
      >
        {/*
          Tamanho por `style`, não por atributo: o Satori (motor do
          ImageResponse) rejeita width/height como string e o build de
          produção quebrava aqui — o dev não pegava porque a rota só era
          gerada sob demanda.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- isto roda no
            Satori (gerador de PNG), onde next/image não existe. */}
        <img
          style={{ width: 104, height: 104 }}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(SIMBOLO)}`}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
