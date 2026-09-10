import type { NextConfig } from "next";

// Site 100% estático, publicado no GitHub Pages em
// https://Lucasnakagaky.github.io/Projeto_Quadros_Contel/
// - output: "export"  -> `next build` gera a pasta `out/` (HTML/CSS/JS puro)
// - basePath           -> tudo servido sob /Projeto_Quadros_Contel
// - images.unoptimized -> sem o otimizador de imagem do Next (exige servidor)
// - trailingSlash      -> /pipes -> /pipes/index.html (o Pages resolve sem servidor)
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Projeto_Quadros_Contel",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
