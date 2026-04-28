import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountInput } from "../AmountInput";

describe("AmountInput", () => {
  it("affiche 0 si value est vide", () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
  });

  it("affiche la valeur formatée FR au repos (blur)", () => {
    render(<AmountInput value="120000" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    // Pas en focus → doit afficher 120 000
    expect(input).toHaveValue("120 000");
  });

  it("affiche 120 000,50 pour une valeur décimale", () => {
    render(<AmountInput value="120000.50" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("120 000,50");
  });

  it("affiche la devise DH par défaut", () => {
    render(<AmountInput value="5000" onChange={vi.fn()} />);
    expect(screen.getByText("DH")).toBeInTheDocument();
  });

  it("affiche une devise personnalisée", () => {
    render(<AmountInput value="5000" onChange={vi.fn()} currency="EUR" />);
    expect(screen.getByText("EUR")).toBeInTheDocument();
  });

  it("appelle onChange avec la valeur machine (pas formatée) à la saisie", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.type(input, "5000");

    // La dernière valeur appelée doit être "5000" (format machine)
    expect(handleChange).toHaveBeenLastCalledWith("5000");
  });

  it("normalise la virgule en point sur blur", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.type(input, "1500,50");
    await user.tab(); // blur

    // Après blur : onChange appelé avec format machine "1500.50"
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall).toBe("1500.50");
  });

  it("affiche la valeur non-formatée pendant la saisie (focus)", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AmountInput value="120000" onChange={handleChange} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    // En focus, doit afficher valeur brute avec virgule (120000 → "120000")
    expect(input).toHaveValue("120000");
  });

  it("affiche le label si fourni", () => {
    render(<AmountInput value="" onChange={vi.fn()} label="Montant total" />);
    expect(screen.getByText("Montant total")).toBeInTheDocument();
  });

  it("affiche le message d'erreur", () => {
    render(
      <AmountInput value="" onChange={vi.fn()} error="Montant obligatoire" />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Montant obligatoire");
  });

  it("est désactivé quand disabled=true", () => {
    render(<AmountInput value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("stocke la valeur en string machine (pas de float)", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.type(input, "0.1");

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    // Doit être une string, pas un float
    expect(typeof lastCall).toBe("string");
    expect(lastCall).toBe("0.1");
  });
});
