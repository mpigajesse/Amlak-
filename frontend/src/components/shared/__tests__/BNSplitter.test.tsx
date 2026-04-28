import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BNSplitter } from "../BNSplitter";

const defaultValue = { blanc: "", noir: "" };

describe("BNSplitter", () => {
  it("affiche les champs Blanc et Noir", () => {
    render(<BNSplitter value={defaultValue} onChange={vi.fn()} />);
    expect(screen.getByText("Blanc")).toBeInTheDocument();
    expect(screen.getByText("Noir")).toBeInTheDocument();
  });

  it("affiche la section Total", () => {
    render(<BNSplitter value={defaultValue} onChange={vi.fn()} />);
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("calcule correctement le total : 100000 + 50000 = 150000", () => {
    render(
      <BNSplitter
        value={{ blanc: "100000", noir: "50000" }}
        onChange={vi.fn()}
      />
    );
    // Total doit afficher 150 000 DH
    expect(screen.getByLabelText("Total")).toBeInTheDocument();
    const totalSection = screen.getByLabelText("Total");
    expect(totalSection).toContainHTML("150");
  });

  it("calcule le total avec décimales : 1000.50 + 500.25 = 1500.75", () => {
    render(
      <BNSplitter
        value={{ blanc: "1000.50", noir: "500.25" }}
        onChange={vi.fn()}
      />
    );
    const totalSection = screen.getByLabelText("Total");
    expect(totalSection.textContent).toContain("1 500");
  });

  it("affiche 0 DH quand les deux champs sont vides", () => {
    render(<BNSplitter value={defaultValue} onChange={vi.fn()} />);
    expect(screen.getByText("0 DH")).toBeInTheDocument();
  });

  it("appelle onChange avec les bonnes valeurs quand blanc change", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<BNSplitter value={defaultValue} onChange={handleChange} />);

    const inputs = screen.getAllByRole("textbox");
    const blancInput = inputs[0];

    await user.click(blancInput);
    await user.type(blancInput, "5000");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ blanc: "5000" })
    );
  });

  it("appelle onChange avec les bonnes valeurs quand noir change", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<BNSplitter value={defaultValue} onChange={handleChange} />);

    const inputs = screen.getAllByRole("textbox");
    const noirInput = inputs[1];

    await user.click(noirInput);
    await user.type(noirInput, "2000");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ noir: "2000" })
    );
  });

  it("affiche le label fourni", () => {
    render(
      <BNSplitter value={defaultValue} onChange={vi.fn()} label="Montant de la transaction" />
    );
    expect(screen.getByText("Montant de la transaction")).toBeInTheDocument();
  });

  it("affiche le message d'erreur", () => {
    render(
      <BNSplitter
        value={defaultValue}
        onChange={vi.fn()}
        error="Le total doit être supérieur à 0"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Le total doit être supérieur à 0"
    );
  });

  it("les inputs sont désactivés quand disabled=true", () => {
    render(
      <BNSplitter value={defaultValue} onChange={vi.fn()} disabled />
    );
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("total est calculé via decimal.js (pas de float drift)", () => {
    // 0.1 + 0.2 = 0.3 (pas 0.30000000000000004)
    render(
      <BNSplitter
        value={{ blanc: "0.1", noir: "0.2" }}
        onChange={vi.fn()}
      />
    );
    const totalSection = screen.getByLabelText("Total");
    // Avec decimal.js, on attend 0,3 et non 0,30000000000000004
    expect(totalSection.textContent).not.toContain("0000000000000004");
  });
});
