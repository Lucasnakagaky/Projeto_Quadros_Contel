import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * <Link> com prefetch desligado por padrão.
 *
 * No build estático publicado no GitHub Pages, o prefetch do "segment cache"
 * do Next pede arquivos .txt de prefetch com um nome achatado por pontos
 * (ex.: __next.pipes.$d$pipeId.__PAGE__.txt) que o `next build` não gera —
 * ele grava esses segmentos em pastas aninhadas. O resultado é uma enxurrada
 * de 404 no console. A navegação client-side em si não usa esses arquivos e
 * continua funcionando; só o prefetch antecipado quebra. Desligá-lo resolve.
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
