import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("rend le titre quand ouvert", () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirmation">
        <p>Contenu du modal</p>
      </Modal>
    );

    expect(screen.getByText("Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Contenu du modal")).toBeInTheDocument();
  });

  it("ne rend rien quand fermé", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Titre caché">
        <p>Contenu caché</p>
      </Modal>
    );

    expect(screen.queryByText("Titre caché")).not.toBeInTheDocument();
  });

  it("appelle onClose au clic sur le bouton Fermer", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose à la pression de la touche Echap", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test Echap">
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rend le footer quand fourni", () => {
    render(
      <Modal
        open
        onClose={vi.fn()}
        title="Avec footer"
        footer={<button>Enregistrer</button>}
      >
        <p>Corps</p>
      </Modal>
    );

    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
  });

  it("a les attributs ARIA requis", () => {
    render(
      <Modal open onClose={vi.fn()} title="Accessible">
        <p>Corps</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // aria-labelledby uses a generated useId() — verify it points to the title element
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    expect(document.getElementById(labelledById!)).toHaveTextContent("Accessible");
  });
});
