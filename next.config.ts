import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Liga a integração do <ViewTransition> do React com a navegação do
    // App Router — é o que faz a troca de página animar em vez de estalar.
    // Sem suporte no navegador, tudo funciona igual, só não anima.
    viewTransition: true,
  },
};

export default nextConfig;
