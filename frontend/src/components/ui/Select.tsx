import {
  forwardRef,
  useId,
  useRef,
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
  /** Accessible label (si pas de <FormField> parent) */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Select stylé, entièrement accessible au clavier.
 * Navigation : Entrée/Espace ouvre, flèches bougent, Entrée/Espace sélectionne,
 * Echap ferme, lettres jumpent à l'option correspondante.
 * forwardRef expose le bouton trigger.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder = "Sélectionner…",
      disabled = false,
      error,
      id,
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
    },
    ref
  ) => {
    const generatedId = useId();
    const triggerId = id ?? generatedId;
    const listboxId = `${triggerId}-listbox`;

    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    const close = useCallback(() => {
      setOpen(false);
      setHighlighted(-1);
    }, []);

    const selectIndex = useCallback(
      (index: number) => {
        if (index >= 0 && index < options.length) {
          onChange(options[index].value);
          close();
        }
      },
      [options, onChange, close]
    );

    // Ferme au clic extérieur
    useEffect(() => {
      if (!open) return;

      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          close();
        }
      };

      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open, close]);

    // Scroll l'option highlighted en vue
    useEffect(() => {
      if (!open || highlighted < 0 || !listRef.current) return;
      const item = listRef.current.children[highlighted] as HTMLElement | null;
      item?.scrollIntoView({ block: "nearest" });
    }, [highlighted, open]);

    // Initialise la surbrillance sur l'option sélectionnée à l'ouverture
    useEffect(() => {
      if (open) {
        const idx = options.findIndex((o) => o.value === value);
        setHighlighted(idx >= 0 ? idx : 0);
      }
    }, [open, value, options]);

    const handleTriggerKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        switch (e.key) {
          case "Enter":
          case " ":
          case "ArrowDown":
            e.preventDefault();
            setOpen(true);
            break;
          case "ArrowUp":
            e.preventDefault();
            setOpen(true);
            break;
          case "Escape":
            close();
            break;
        }
      },
      [close]
    );

    const handleListKeyDown = useCallback(
      (e: KeyboardEvent<HTMLUListElement>) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setHighlighted((prev) => Math.min(prev + 1, options.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setHighlighted((prev) => Math.max(prev - 1, 0));
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            selectIndex(highlighted);
            break;
          case "Escape":
            e.preventDefault();
            close();
            break;
          case "Home":
            e.preventDefault();
            setHighlighted(0);
            break;
          case "End":
            e.preventDefault();
            setHighlighted(options.length - 1);
            break;
          default:
            // Jump à la première option commençant par la lettre
            if (e.key.length === 1) {
              const char = e.key.toLowerCase();
              const idx = options.findIndex((o) =>
                o.label.toLowerCase().startsWith(char)
              );
              if (idx >= 0) setHighlighted(idx);
            }
        }
      },
      [options, highlighted, selectIndex, close]
    );

    // Focus automatique sur la liste à l'ouverture
    useEffect(() => {
      if (open) {
        requestAnimationFrame(() => listRef.current?.focus());
      }
    }, [open]);

    return (
      <div ref={containerRef} className={clsx("relative", className)}>
        {/* Trigger */}
        <button
          ref={ref}
          id={triggerId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-invalid={!!error}
          disabled={disabled}
          onClick={() => (open ? close() : setOpen(true))}
          onKeyDown={handleTriggerKeyDown}
          className={clsx(
            "w-full flex items-center justify-between gap-2",
            "px-3 py-2.5 text-sm font-sans",
            "bg-bg border rounded",
            "transition-colors",
            "focus:outline-none",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-subtle",
            error
              ? "border-negative focus:border-negative text-ink"
              : open
              ? "border-accent text-ink"
              : "border-line hover:border-line-strong text-ink"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        >
          <span
            className={clsx(
              "truncate text-left",
              !selectedOption && "text-ink-muted"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={clsx(
              "flex-shrink-0 text-ink-muted transition-transform",
              open && "rotate-180"
            )}
            style={{ transitionDuration: "var(--transition-fast)" }}
          />
        </button>

        {/* Listbox */}
        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel ?? "Options"}
            onKeyDown={handleListKeyDown}
            className={clsx(
              "absolute z-[50] w-full mt-1",
              "bg-bg-card border border-line rounded-lg shadow-lg",
              "max-h-60 overflow-y-auto py-1",
              "focus:outline-none"
            )}
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlighted;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // mousedown pour éviter blur du trigger avant le click
                    e.preventDefault();
                    onChange(option.value);
                    close();
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={clsx(
                    "flex items-center justify-between",
                    "px-3 py-2.5 text-sm font-sans cursor-pointer",
                    "transition-colors",
                    isHighlighted
                      ? "bg-accent-bg text-ink"
                      : "text-ink hover:bg-black/[0.03]",
                    isSelected && "font-medium"
                  )}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      aria-hidden="true"
                      className="flex-shrink-0 text-accent"
                    />
                  )}
                </li>
              );
            })}

            {options.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-ink-muted text-center">
                Aucune option disponible
              </li>
            )}
          </ul>
        )}

        {/* Message d'erreur */}
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-negative font-sans">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
