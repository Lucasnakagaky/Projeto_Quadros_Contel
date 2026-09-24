import { describe, expect, it } from "vitest";
import { formatarVencimento, parseDataSolta } from "./utils";

describe("parseDataSolta", () => {
  it("não desloca uma data pura (YYYY-MM-DD) para o dia anterior", () => {
    // new Date("2026-09-25") é tratado pela spec como meia-noite em UTC — em qualquer fuso
    // atrás de UTC (ex.: America/Sao_Paulo, -3, que é o fuso desta máquina) isso derruba a
    // data pra 24/09 ao formatar em hora local. parseDataSolta precisa preservar 25/09.
    const d = parseDataSolta("2026-09-25");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // setembro = índice 8
    expect(d.getDate()).toBe(25);
  });

  it("interpreta um datetime-local (YYYY-MM-DDTHH:mm) em hora local, sem deslocar", () => {
    const d = parseDataSolta("2026-09-25T14:30");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("comprova a regressão que motivou o helper: new Date() nativo desloca, parseDataSolta não", () => {
    const dataPura = "2026-09-25";
    const ingenuo = new Date(dataPura);
    const seguro = parseDataSolta(dataPura);
    // Só falha o teste se a máquina estiver num fuso onde o bug realmente se manifesta
    // (atrás de UTC — inclui o horário do Brasil, usado nesta máquina); serve de sentinela.
    if (ingenuo.getTimezoneOffset() > 0) {
      expect(ingenuo.getDate()).not.toBe(seguro.getDate());
    }
    expect(seguro.getDate()).toBe(25);
  });
});

describe("formatarVencimento", () => {
  it("mostra só a data para valor legado sem horário (compat com cards antigos)", () => {
    expect(formatarVencimento("2026-09-25")).toBe("25/09/2026");
  });

  it("mostra data e hora quando o valor já tem horário", () => {
    expect(formatarVencimento("2026-09-25T14:30")).toBe("25/09/2026 às 14:30");
  });

  it("alterar só a hora preserva a data, e vice-versa", () => {
    expect(formatarVencimento("2026-09-25T18:00")).toBe("25/09/2026 às 18:00");
    expect(formatarVencimento("2026-09-28T14:30")).toBe("28/09/2026 às 14:30");
  });

  it("valor vazio/ inválido não quebra", () => {
    expect(formatarVencimento("")).toBe("");
    expect(formatarVencimento("não-é-data")).toBe("");
  });
});
