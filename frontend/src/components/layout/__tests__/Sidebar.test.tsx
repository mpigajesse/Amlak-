import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("affiche tous les items de navigation desktop", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Projets")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Chèques")).toBeInTheDocument();
    expect(screen.getByText("Fournisseurs")).toBeInTheDocument();
    expect(screen.getByText("Rapports")).toBeInTheDocument();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("affiche le wordmark Amlak", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    // Le wordmark est dans l'en-tête de la sidebar
    const wordmark = screen.getAllByText("Amlak");
    expect(wordmark.length).toBeGreaterThanOrEqual(1);
  });

  it("rend le drawer mobile quand mobileOpen est true", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar mobileOpen={true} onMobileClose={onClose} />
      </MemoryRouter>
    );

    // Le dialog mobile doit être rendu dans le portal
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("ne rend pas le drawer mobile quand mobileOpen est false", () => {
    render(
      <MemoryRouter>
        <Sidebar mobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
