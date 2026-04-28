import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StagePill } from "../StagePill";

describe("StagePill — Cycle Achat", () => {
  it('affiche "Opportunité" pour stage opportunite', () => {
    render(<StagePill stage="opportunite" />);
    expect(screen.getByText("Opportunité")).toBeInTheDocument();
  });

  it('affiche "Négociation" pour stage negociation', () => {
    render(<StagePill stage="negociation" />);
    expect(screen.getByText("Négociation")).toBeInTheDocument();
  });

  it('affiche "Promis" pour stage promis', () => {
    render(<StagePill stage="promis" />);
    expect(screen.getByText("Promis")).toBeInTheDocument();
  });

  it('affiche "Compromis" pour stage compromis', () => {
    render(<StagePill stage="compromis" />);
    expect(screen.getByText("Compromis")).toBeInTheDocument();
  });

  it('affiche "Réservé" pour stage reserve', () => {
    render(<StagePill stage="reserve" />);
    expect(screen.getByText("Réservé")).toBeInTheDocument();
  });

  it('affiche "Acheté" pour stage achete', () => {
    render(<StagePill stage="achete" />);
    expect(screen.getByText("Acheté")).toBeInTheDocument();
  });
});

describe("StagePill — Cycle Vente", () => {
  it('affiche "Stock dispo" pour stage stock', () => {
    render(<StagePill stage="stock" />);
    expect(screen.getByText("Stock dispo")).toBeInTheDocument();
  });

  it('affiche "Réservé" pour stage reservation', () => {
    render(<StagePill stage="reservation" />);
    expect(screen.getByText("Réservé")).toBeInTheDocument();
  });

  it('affiche "Compromis" pour stage compromis (vente)', () => {
    render(<StagePill stage="compromis" cycle="vente" />);
    expect(screen.getByText("Compromis")).toBeInTheDocument();
  });

  it('affiche "Encaissé" pour stage encaisse', () => {
    render(<StagePill stage="encaisse" />);
    expect(screen.getByText("Encaissé")).toBeInTheDocument();
  });
});

describe("StagePill — Stages généraux", () => {
  it('affiche "Annulé" pour stage annule', () => {
    render(<StagePill stage="annule" />);
    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it('affiche "Actif" pour stage actif', () => {
    render(<StagePill stage="actif" />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it('affiche "Clôturé" pour stage cloture', () => {
    render(<StagePill stage="cloture" />);
    expect(screen.getByText("Clôturé")).toBeInTheDocument();
  });

  it("affiche le stage brut si inconnu (fallback)", () => {
    render(<StagePill stage="un-stage-inconnu" />);
    expect(screen.getByText("un-stage-inconnu")).toBeInTheDocument();
  });
});

describe("StagePill — Classes CSS", () => {
  it("applique les classes de base (badge layout)", () => {
    const { container } = render(<StagePill stage="opportunite" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("inline-flex", "items-center");
  });

  it("accepte className supplémentaire", () => {
    const { container } = render(
      <StagePill stage="achete" className="ml-2" />
    );
    expect(container.firstChild).toHaveClass("ml-2");
  });

  it("les icônes ont aria-hidden=true", () => {
    const { container } = render(<StagePill stage="opportunite" />);
    const icon = container.querySelector("[aria-hidden]");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
