/**
 * ACME — Site institucional
 * JavaScript puro (sem frameworks/dependências), organizado por
 * responsabilidade: dados de conteúdo, componentes reutilizáveis (render)
 * e interações (menu, formulário, scroll).
 */
(function () {
  "use strict";

  /* ==========================================================================
     1. DADOS DE CONTEÚDO
     Mantidos em arrays/objetos separados do HTML para facilitar manutenção:
     para adicionar um serviço ou projeto novo, basta editar os dados abaixo —
     o "componente" de card é reaproveitado automaticamente.
     ========================================================================== */
  var ESTATISTICAS = [
    { numero: "12+", label: "Anos de mercado" },
    { numero: "180+", label: "Projetos entregues" },
    { numero: "40", label: "Especialistas" },
    { numero: "98%", label: "Clientes satisfeitos" },
  ];

  var SERVICOS = [
    {
      icone: "🎨",
      titulo: "Design de Produto",
      texto:
        "Criamos interfaces claras e consistentes, com foco em usabilidade e identidade de marca.",
    },
    {
      icone: "💻",
      titulo: "Desenvolvimento Web",
      texto:
        "Sites e sistemas rápidos, seguros e escaláveis, construídos com boas práticas de engenharia.",
    },
    {
      icone: "📈",
      titulo: "Estratégia Digital",
      texto:
        "Planejamento orientado a dados para guiar decisões de produto e marketing.",
    },
    {
      icone: "🔧",
      titulo: "Manutenção &amp; Suporte",
      texto:
        "Evolução contínua do seu produto, com monitoramento e correções ágeis.",
    },
    {
      icone: "☁",
      titulo: "Infraestrutura &amp; Cloud",
      texto:
        "Arquitetura em nuvem confiável, com foco em performance e custo controlado.",
    },
    {
      icone: "🔒",
      titulo: "Segurança da Informação",
      texto:
        "Boas práticas e auditorias para proteger os dados da sua empresa e dos seus clientes.",
    },
  ];

  var PORTFOLIO = [
    { tag: "E-commerce", titulo: "Loja Virtual Nordic", texto: "Plataforma completa de vendas online com painel administrativo." },
    { tag: "Institucional", titulo: "Grupo Horizonte", texto: "Site institucional multilíngue para grupo empresarial." },
    { tag: "Sistema Web", titulo: "Gestor Financeiro Plus", texto: "Sistema de gestão financeira para pequenas empresas." },
  ];

  /* ==========================================================================
     2. COMPONENTES (funções de renderização reutilizáveis)
     Cada função recebe dados e devolve uma string HTML. São "componentes"
     no sentido de template reaproveitável, sem depender de um framework.
     ========================================================================== */
  function renderStatCard(item) {
    return (
      '<li class="stat">' +
      '<span class="stat__numero">' + item.numero + "</span>" +
      '<span class="stat__label">' + item.label + "</span>" +
      "</li>"
    );
  }

  function renderServicoCard(item) {
    return (
      '<article class="card">' +
      '<span class="card__icone" aria-hidden="true">' + item.icone + "</span>" +
      '<h3 class="card__titulo">' + item.titulo + "</h3>" +
      '<p class="card__texto">' + item.texto + "</p>" +
      "</article>"
    );
  }

  function renderPortfolioCard(item) {
    return (
      '<article class="card card--portfolio">' +
      '<div class="card--portfolio__capa" aria-hidden="true"></div>' +
      '<div class="card--portfolio__corpo">' +
      '<span class="card__tag">' + item.tag + "</span>" +
      '<h3 class="card__titulo">' + item.titulo + "</h3>" +
      '<p class="card__texto">' + item.texto + "</p>" +
      "</div>" +
      "</article>"
    );
  }

  /**
   * Preenche um elemento com uma lista de itens, usando a função de
   * renderização informada. Mantém a lógica de "listar" desacoplada de
   * cada tipo de card específico.
   */
  function montarLista(elementoId, itens, renderFn) {
    var container = document.getElementById(elementoId);
    if (!container) return;
    container.innerHTML = itens.map(renderFn).join("");
  }

  /* ==========================================================================
     3. MENU MOBILE (nav-toggle)
     ========================================================================== */
  function iniciarMenuMobile() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("menuPrincipal");
    if (!toggle || !nav) return;

    function fecharMenu() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu de navegação");
    }

    function alternarMenu() {
      var aberto = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(aberto));
      toggle.setAttribute(
        "aria-label",
        aberto ? "Fechar menu de navegação" : "Abrir menu de navegação"
      );
    }

    toggle.addEventListener("click", alternarMenu);

    // Fecha o menu ao clicar em um link (útil em telas pequenas)
    nav.querySelectorAll(".nav__link, .nav__cta").forEach(function (link) {
      link.addEventListener("click", fecharMenu);
    });

    // Fecha o menu ao pressionar "Esc", devolvendo o foco ao botão de menu
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        fecharMenu();
        toggle.focus();
      }
    });
  }

  /* ==========================================================================
     4. FORMULÁRIO DE CONTATO
     Validação client-side simples (sem dependências). O envio real exige
     integração com um back-end/serviço de formulários — aqui apenas
     simulamos o retorno de sucesso após validar os campos.
     ========================================================================== */
  function validarCampo(input, mensagemErro) {
    var campo = input.closest(".form__field");
    var erroEl = campo ? campo.querySelector(".form__erro") : null;
    var valido = input.checkValidity();

    if (campo) campo.classList.toggle("is-invalid", !valido);
    if (erroEl) erroEl.textContent = valido ? "" : mensagemErro;

    return valido;
  }

  function iniciarFormularioContato() {
    var form = document.getElementById("formContato");
    if (!form) return;

    var status = document.getElementById("formStatus");
    var nome = document.getElementById("nome");
    var email = document.getElementById("email");
    var mensagem = document.getElementById("mensagem");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var nomeValido = validarCampo(nome, "Informe seu nome.");
      var emailValido = validarCampo(email, "Informe um e-mail válido.");
      var mensagemValida = validarCampo(mensagem, "Escreva uma mensagem.");

      if (!(nomeValido && emailValido && mensagemValida)) {
        status.textContent = "Verifique os campos destacados antes de enviar.";
        status.setAttribute("data-tipo", "erro");
        return;
      }

      // Integração real de envio (API/e-mail) entra aqui.
      status.textContent =
        "Mensagem enviada com sucesso! Em breve entraremos em contato.";
      status.setAttribute("data-tipo", "sucesso");
      form.reset();
    });
  }

  /* ==========================================================================
     5. BOTÃO "VOLTAR AO TOPO"
     Aparece após o usuário rolar a página além de uma altura mínima.
     ========================================================================== */
  function iniciarBotaoTopo() {
    var botao = document.getElementById("backToTop");
    if (!botao) return;

    var LIMITE_SCROLL = 400;

    function atualizarVisibilidade() {
      botao.hidden = window.scrollY < LIMITE_SCROLL;
    }

    window.addEventListener("scroll", atualizarVisibilidade, { passive: true });
    botao.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    atualizarVisibilidade();
  }

  /* ==========================================================================
     6. INICIALIZAÇÃO
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    montarLista("statsList", ESTATISTICAS, renderStatCard);
    montarLista("servicosGrid", SERVICOS, renderServicoCard);
    montarLista("portfolioGrid", PORTFOLIO, renderPortfolioCard);

    iniciarMenuMobile();
    iniciarFormularioContato();
    iniciarBotaoTopo();

    var anoEl = document.getElementById("anoAtual");
    if (anoEl) anoEl.textContent = String(new Date().getFullYear());
  });
})();
