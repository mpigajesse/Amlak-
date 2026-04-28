import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { MobileNav } from "@/components/layout/MobileNav";

describe("MobileNav", () => {
  it("affiche les 5 items de navigation mobile", () => {
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>
    );

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Projets")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Chèques")).toBeInTheDocument();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("a le role nav avec un label accessible", () => {
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: /navigation mobile/i });
    expect(nav).toBeInTheDocument();
  });

  it("n'affiche pas plus de 5 items", () => {
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>
    );

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(5);
  });
});
