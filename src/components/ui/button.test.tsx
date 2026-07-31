import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza com as props padrão (variant default, size default)", () => {
    render(<Button>Salvar</Button>);

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button.className).toContain("bg-blue-600");
    expect(button.className).toContain("h-9");
  });

  it("aplica as classes do variant e size informados", () => {
    render(
      <Button variant="destructive" size="sm">
        Excluir
      </Button>
    );

    const button = screen.getByRole("button", { name: "Excluir" });
    expect(button.className).toContain("bg-red-600");
    expect(button.className).toContain("h-8");
  });

  it("chama onClick ao ser clicado", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Clique aqui</Button>);

    await user.click(screen.getByRole("button", { name: "Clique aqui" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não chama onClick quando desabilitado", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Indisponível
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "Indisponível" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Indisponível" })).toBeDisabled();
  });

  it("encaminha a ref para o elemento <button> nativo", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          ref = el;
        }}
      >
        Com ref
      </Button>
    );

    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });
});
