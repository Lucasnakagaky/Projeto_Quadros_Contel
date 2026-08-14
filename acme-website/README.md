# Site Institucional — ACME

Site institucional estático (HTML/CSS/JS puro), desenvolvido como entrega das
subtarefas **"Design do Layout"** e **"Desenvolvimento Front-end"** do projeto
de website da Empresa ACME.

## Por que HTML/CSS/JS puro (sem framework)?

- O site é essencialmente **conteúdo estático** (7 seções, sem estado
  complexo nem múltiplas páginas dinâmicas) — um framework como React/Next.js
  adicionaria complexidade e build step sem benefício real aqui.
- Requisito explícito de **"sem dependências desnecessárias"**: o projeto
  roda em qualquer navegador, sem `npm install`, sem bundler e sem
  requisições externas (fontes, ícones e ilustração são todos gerados
  localmente).
- Facilita a manutenção por qualquer pessoa com conhecimento básico de
  HTML/CSS/JS, e pode ser hospedado em qualquer servidor estático (Netlify,
  Vercel, GitHub Pages, S3, etc.) sem configuração adicional.

Este projeto é independente do restante do repositório (o app Kanban em
`src/`) — não compartilha dependências nem é afetado pelo build do Next.js.

## Estrutura de pastas

```
acme-website/
├── index.html          # Página única, com todas as seções do site
├── css/
│   └── styles.css       # Estilos: tokens de design, layout, responsividade
├── js/
│   └── main.js           # Interações: menu mobile, formulário, componentes
└── README.md
```

## Seções do site

- **Header/Navegação** — logo, menu (com versão mobile em "hambúrguer") e CTA.
- **Hero** — chamada principal e ilustração em SVG.
- **Sobre** — apresentação da empresa e estatísticas.
- **Serviços** — grade de cards gerada a partir de `js/main.js`.
- **Portfólio** — projetos em destaque.
- **Contato** — informações de contato + formulário com validação.
- **Footer** — navegação secundária e créditos.

## Componentização

Sem um framework, a reutilização é feita por meio de **funções de
renderização** em `js/main.js` (`renderStatCard`, `renderServicoCard`,
`renderPortfolioCard`): os dados de estatísticas, serviços e projetos ficam
em arrays no topo do arquivo, e cada card é gerado a partir do mesmo template.
Para adicionar um serviço ou projeto novo, basta editar os arrays — não é
necessário duplicar HTML.

## Acessibilidade e semântica

- HTML semântico (`header`, `nav`, `main`, `section`, `footer`).
- Link "Pular para o conteúdo principal" para navegação via teclado.
- `aria-label`, `aria-expanded` e `aria-controls` no menu mobile.
- Contraste de cores adequado e estados de foco visíveis (`:focus-visible`).
- Formulário com `label` associado a cada campo e mensagens de erro em
  `role="alert"`.
- Respeita `prefers-reduced-motion` para usuários sensíveis a animação.

## Como rodar/visualizar localmente

**Opção mais simples:** abra o arquivo `index.html` diretamente no navegador
(duplo clique ou arrastar para a janela do navegador).

**Opção recomendada (evita eventuais restrições do navegador ao abrir via
`file://` e é mais fiel a um ambiente de produção):** sirva a pasta com um
servidor estático simples. Exemplos:

```bash
# Usando Python (já vem instalado na maioria dos sistemas)
cd acme-website
python -m http.server 8080
# depois acesse http://localhost:8080

# Ou usando Node.js, sem instalar nada globalmente
cd acme-website
npx serve .
```

Nenhuma instalação de dependências é necessária além do servidor estático
escolhido — não há `package.json` neste projeto.
