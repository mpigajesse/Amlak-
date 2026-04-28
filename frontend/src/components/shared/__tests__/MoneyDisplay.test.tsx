import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Decimal from "decimal.js";
import { MoneyDisplay } from "../MoneyDisplay";

describe("MoneyDisplay", () => {
  it("affiche un montant formaté en français", () => {
    render(<MoneyDisplay value="120000" />);
    // 120 000 DH — avec espace milliers
    const el = screen.getByText(/120.*000/);
    expect(el).toBeInTheDocument();
  });

  it("affiche la devise DH par défaut", () => {
    render(<MoneyDisplay value="5000" />);
    expect(screen.getByText("DH")).toBeInTheDocument();
  });

  it("affiche une devise personnalisée", () => {
    render(<MoneyDisplay value="5000" currency="EUR" />);
    expect(screen.getByText("EUR")).toBeInTheDocument();
  });

  it("est en vert (text-positive) pour un montant positif (auto-detect)", () => {
    const { container } = render(<MoneyDisplay value="1000" />);
    expect(container.firstChild).toHaveClass("text-positive");
  });

  it("est en rouge (text-negative) pour un montant négatif (auto-detect)", () => {
    const { container } = render(<MoneyDisplay value="-1000" />);
    expect(container.firstChild).toHaveClass("text-negative");
  });

  it("est en texte normal pour zéro (auto-detect)", () => {
    const { container } = render(<MoneyDisplay value="0" />);
    expect(container.firstChild).toHaveClass("text-ink");
    expect(container.firstChild).not.toHaveClass("text-positive");
    expect(container.firstChild).not.toHaveClass("text-negative");
  });

  it("force la couleur positive si positive=true, même pour 0", () => {
    const { container } = render(<MoneyDisplay value="0" positive={true} />);
    expect(container.firstChild).toHaveClass("text-positive");
  });

  it("force la couleur négative si positive=false", () => {
    const { container } = render(<MoneyDisplay value="1000" positive={false} />);
    expect(container.firstChild).toHaveClass("text-negative");
  });

  it("utilise font-mono tabular-nums", () => {
    const { container } = render(<MoneyDisplay value="5000" />);
    expect(container.firstChild).toHaveClass("font-mono", "tabular-nums");
  });

  it("accepte une instance Decimal", () => {
    const dec = new Decimal("75000.50");
    render(<MoneyDisplay value={dec} />);
    const el = screen.getByText(/75.*000/);
    expect(el).toBeInTheDocument();
  });

  it("accepte un nombre (number)", () => {
    render(<MoneyDisplay value={5000} />);
    const el = screen.getByText(/5.*000/);
    expect(el).toBeInTheDocument();
  });

  it("affiche en compact pour les milliers (compact=true)", () => {
    render(<MoneyDisplay value="120000" compact />);
    // Doit afficher "120k" ou "0,12M" — au moins pas "120 000"
    const span = document.querySelector("span");
    expect(span?.textContent).toMatch(/k|M/);
  });

  it("applique className supplémentaire", () => {
    const { container } = render(
      <MoneyDisplay value="5000" className="text-xl" />
    );
    expect(container.firstChild).toHaveClass("text-xl");
  });
});
