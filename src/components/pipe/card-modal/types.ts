import { Anexo, Campo, Card, CardLink, Checklist, Comentario, Conexao, Etiqueta, Fase, Pipe, Usuario } from "@/lib/types";

export interface ConexaoResolvida {
  conexao: Conexao;
  card?: Card;
  fase?: Fase;
  pipe?: Pipe;
}

export interface CardLinkResolvida {
  link: CardLink;
  card?: Card;
  fase?: Fase;
  direcao: "origem" | "destino";
}

export interface CardDetail {
  card: Card;
  pipe: Pipe;
  fases: Fase[];
  campos: Campo[];
  etiquetas: Etiqueta[];
  usuarios: Usuario[];
  checklists: Checklist[];
  comentarios: Comentario[];
  anexos: Anexo[];
  conexoesFilhos: ConexaoResolvida[];
  conexoesPais: ConexaoResolvida[];
  cardLinks: CardLinkResolvida[];
}
