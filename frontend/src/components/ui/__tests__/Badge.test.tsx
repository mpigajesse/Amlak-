import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("rend le contenu", () => {
    render(<Badge>En cours</Badge>);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("applique la classe du variant neutral par défaut", () => {
    render(<Badge>Neutre</Badge>);
    const badge = screen.getByText("Neutre");
    expect(badge.className).toContain("text-ink-soft");
  });

  it("applique la classe du variant positive", () => {
    render(<Badge variant="positive">Payé</Badge>);
    const badge = screen.getByText("Payé");
    expect(badge.className).toContain("text-positive");
  });

  it("applique la classe du variant negative", () => {
    render(<Badge variant="negative">Rejeté</Badge>);
    const badge = screen.getByText("Rejeté");
    expect(badge.className).toContain("text-negative");
  });

  it("applique la classe du variant warning", () => {
    render(<Badge variant="warning">En retard</Badge>);
    const badge = screen.getByText("En retard");
    expect(badge.className).toContain("text-warning");
  });

  it("applique la classe du variant info", () => {
    render(<Badge variant="info">Information</Badge>);
    const badge = screen.getByText("Information");
    expect(badge.className).toContain("text-accent");
  });

  it("accepte une className supplémentaire", () => {
    render(<Badge className="custom-class">Personnalisé</Badge>);
    expect(screen.getByText("Personnalisé").className).toContain("custom-class");
  });
});
