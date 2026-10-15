// Estilos compartilhados do Card Aberto ("Glass Workspace"). Só classes: nenhum comportamento.
// Concentrar aqui evita espalhar valores arbitrários pelos ~15 componentes do modal, e deixa
// claro o que é local ao card (nada aqui altera o padrão de ui/button, ui/input, ui/popover…).

/** Anel de foco visível, consistente em todo o modal. */
export const FOCO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1";

/** Campos de texto/seleção/data do modal (sobrepõe o foco azul padrão do ui/input por índigo). */
export const INPUT_MODAL =
  "rounded-lg border-slate-200 bg-white/90 focus:border-indigo-400 focus:ring-indigo-100";

/** Botão primário local (Salvar/Enviar/Adicionar) — .gdt-modal-btn em globals.css. */
export const BTN_PRIMARIO = "gdt-modal-btn";

/** Botão secundário/ghost local (Cancelar). */
export const BTN_SECUNDARIO = "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700";

/** Link de ação discreto ("+ Adicionar anexo", "Conectar card", "Editar"…). */
export const LINK_ACAO = `rounded text-xs font-medium text-indigo-600 transition-colors duration-(--duracao-rapida) hover:text-indigo-800 hover:underline ${FOCO}`;

/** Título de seção (Anexos, Checklists, Comentários, Histórico). */
export const TITULO_SECAO = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

/** Chip de ícone das seções (subtarefas azul, conexões violeta). */
export const ICONE_SECAO_AZUL =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-50 to-indigo-100 text-indigo-600 ring-1 ring-indigo-200/60";
export const ICONE_SECAO_VIOLETA =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-50 to-fuchsia-100 text-violet-600 ring-1 ring-violet-200/60";

/** Botão de remover/excluir discreto: neutro e só fica vermelho em hover/foco. */
export const ICONE_REMOVER =
  "rounded p-0.5 text-slate-400 transition-colors duration-(--duracao-rapida) hover:text-red-600 focus-visible:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1";

/** Card sólido compacto (subtarefas, vinculados, pais, anexos): linguagem dos cards do Kanban. */
export const CARD_SOLIDO =
  "rounded-xl border border-slate-200/80 bg-white shadow-(--gdt-sombra-1) transition-[border-color,box-shadow] duration-(--duracao-rapida)";
export const CARD_SOLIDO_HOVER =
  "hover:border-[color-mix(in_srgb,var(--fase,#6366f1)_40%,white)] hover:shadow-(--gdt-sombra-2)";

/** Checkbox do modal: marcado em índigo + foco visível (o ui/checkbox não tem anel de foco). */
export const CHECK_MODAL = `${FOCO} data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600`;

/** Valor clicável de um campo (modo leitura): botão discreto com foco visível. */
export const BTN_VALOR = `rounded text-sm text-slate-700 transition-colors duration-(--duracao-rapida) hover:text-indigo-700 hover:underline ${FOCO}`;
export const BTN_VALOR_VAZIO = `rounded text-sm text-slate-400 transition-colors duration-(--duracao-rapida) hover:text-indigo-600 ${FOCO}`;
