import { Anexo, Card, Checklist, Comentario, Etiqueta, Lista, Usuario } from "@/lib/types";

export interface CardDetail {
  card: Card;
  checklists: Checklist[];
  comentarios: Comentario[];
  anexos: Anexo[];
  etiquetas: Etiqueta[];
  membros: Usuario[];
  listas: Lista[];
  predecessores: Card[];
  candidatosPredecessores: Card[];
}
