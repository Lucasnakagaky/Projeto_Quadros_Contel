# Pipes — clone funcional de um board estilo Pipefy/Kanban

Aplicação Next.js (App Router) + TypeScript com um construtor de formulários por pipe, fases coloridas com drag-and-drop e — o ponto central — **conexões pai/filho entre cards**, bidirecionais e sincronizadas.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/pipes`.

## Persistência

Sem banco de dados externo: os dados ficam em `data/db.json`, lidos/escritos por `src/lib/db.ts` (fila de escrita serializada para evitar corrupção em gravações concorrentes). Ao rodar pela primeira vez, o arquivo é criado automaticamente com um pipe de exemplo (fases "Caixa de entrada", "Fazendo" e "Concluído").

## Modelo de dados

`Pipe → Fase → Card`, com `Campo` definindo os campos configuráveis de cada pipe (form builder) e `Conexao` representando a relação pai/filho entre dois cards (`cardPaiId` → `cardFilhoId`), criada através de um campo do tipo **"Conexão de pipe"**.

- Um card pai pode ter vários filhos (conforme a cardinalidade configurada no campo de conexão: único ou vários).
- No card pai, a seção de conexão lista os filhos como chips (título, pipe de origem, criado em, fase atual) e permite criar um novo filho ou conectar um card já existente.
- No card filho, a seção "Este card está conectado a" mostra o(s) pai(s). Como fase/título são lidos ao vivo do card pai (sem cópia duplicada), mover o pai de fase reflete automaticamente no filho.
- Mover um card para a lixeira (soft delete) não apaga a conexão: o filho passa a mostrar um aviso de "conexão quebrada", que se resolve sozinho ao restaurar o pai. A exclusão definitiva só acontece a partir da lixeira, com confirmação extra.

## Estrutura

- `src/lib/types.ts` — tipos e paletas de cor (`CORES_FASE`, `CORES_ETIQUETA`, `TIPOS_CAMPO`).
- `src/lib/db.ts` / `src/lib/store.ts` — persistência e regras de negócio (pipes, fases, campos, cards, conexões, etiquetas, checklists, comentários, anexos).
- `src/app/api/**` — rotas REST finas sobre `store.ts`.
- `src/components/pipe/**` — UI do board (fases, cards, popovers de fase), do modal de detalhe do card (`card-modal/`) e do construtor de formulário (`form-builder/`).

## Escopo

Views da barra superior (Mapa, Fluxo, Lista, Relatórios, Emails, Painéis), abas Email/PDF do card, sugestões de IA, compartilhamento e "Configurar condicionais nos campos" são placeholders visuais ("em breve") — o foco foi colocar o board, o construtor de formulário e a relação pai/filho funcionando de ponta a ponta (criar, editar, mover, excluir/restaurar).
