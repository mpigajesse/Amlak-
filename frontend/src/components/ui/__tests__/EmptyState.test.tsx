import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("rend le titre", () => {
    render(
      <EmptyState title="Aucun projet trouvé" />
    );

    expect(screen.getByText("Aucun projet trouvé")).toBeInTheDocument();
  });

  it("rend la description quand fournie", () => {
    render(
      <EmptyState
        title="Aucun résultat"
        description="Essayez de modifier vos filtres."
      />
    );

    expect(screen.getByText("Essayez de modifier vos filtres.")).toBeInTheDocument();
  });

  it("rend l'action quand fournie", () => {
    render(
      <EmptyState
        title="Liste vide"
        action={<button>Créer un projet</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "Créer un projet" })
    ).toBeInTheDocument();
  });

  it("rend l'icône quand fournie", () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="Dossier vide"
      />
    );

    // L'icône est aria-hidden, on vérifie que le conteneur est rendu
    expect(screen.getByText("Dossier vide")).toBeInTheDocument();
    // Le conteneur icône est dans le DOM
    const container = document.querySelector("[aria-hidden='true']");
    expect(container).toBeInTheDocument();
  });

  it("ne rend pas de description ni d'action si non fournis", () => {
    render(<EmptyState title="Titre seul" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("p")).not.toBeInTheDocument();
  });
});
