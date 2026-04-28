import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Select } from "../Select";

const options = [
  { value: "fr", label: "France" },
  { value: "ma", label: "Maroc" },
  { value: "de", label: "Allemagne" },
];

describe("Select", () => {
  it("affiche le placeholder quand aucune valeur", () => {
    render(
      <Select
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="Choisir un pays"
      />
    );

    expect(screen.getByText("Choisir un pays")).toBeInTheDocument();
  });

  it("affiche la valeur sélectionnée", () => {
    render(
      <Select value="ma" onChange={vi.fn()} options={options} />
    );

    expect(screen.getByText("Maroc")).toBeInTheDocument();
  });

  it("ouvre la liste au clic sur le trigger", () => {
    render(
      <Select value="" onChange={vi.fn()} options={options} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("Maroc")).toBeInTheDocument();
  });

  it("appelle onChange avec la bonne valeur à la sélection", () => {
    const onChange = vi.fn();
    render(
      <Select value="" onChange={onChange} options={options} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByText("Maroc"));
    expect(onChange).toHaveBeenCalledWith("ma");
  });

  it("affiche le message d'erreur", () => {
    render(
      <Select
        value=""
        onChange={vi.fn()}
        options={options}
        error="Ce champ est requis"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Ce champ est requis");
  });

  it("désactive le trigger quand disabled", () => {
    render(
      <Select value="" onChange={vi.fn()} options={options} disabled />
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
