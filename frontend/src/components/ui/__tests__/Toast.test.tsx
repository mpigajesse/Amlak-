import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider } from "../ToastProvider";
import { useToast } from "../useToast";

// Composant helper pour tester le hook
function ToastTrigger({
  onRender,
}: {
  onRender: (fns: ReturnType<typeof useToast>) => void;
}) {
  const toast = useToast();
  onRender(toast);
  return null;
}

describe("Toast / useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche un toast success", () => {
    let toastFns: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <ToastTrigger
          onRender={(fns) => {
            toastFns = fns;
          }}
        />
      </ToastProvider>
    );

    act(() => {
      toastFns!.success("Enregistrement réussi");
    });

    expect(screen.getByText("Enregistrement réussi")).toBeInTheDocument();
  });

  it("affiche un toast error", () => {
    let toastFns: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <ToastTrigger onRender={(fns) => { toastFns = fns; }} />
      </ToastProvider>
    );

    act(() => {
      toastFns!.error("Une erreur est survenue");
    });

    expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
  });

  it("auto-dismiss après la durée spécifiée", () => {
    let toastFns: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <ToastTrigger onRender={(fns) => { toastFns = fns; }} />
      </ToastProvider>
    );

    act(() => {
      toastFns!.success("Message auto-dismiss", { duration: 1000 });
    });

    expect(screen.getByText("Message auto-dismiss")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByText("Message auto-dismiss")).not.toBeInTheDocument();
  });

  it("ne se dismiss pas avant la durée", () => {
    let toastFns: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <ToastTrigger onRender={(fns) => { toastFns = fns; }} />
      </ToastProvider>
    );

    act(() => {
      toastFns!.info("Persistant court", { duration: 2000 });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Persistant court")).toBeInTheDocument();
  });

  it("lève une erreur si useToast est utilisé hors du Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => {
      render(
        <ToastTrigger onRender={() => undefined} />
      );
    }).toThrow();

    spy.mockRestore();
  });
});
