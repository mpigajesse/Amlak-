import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { clsx } from "clsx";

// ── Contexte ──────────────────────────────────────────────────────────────────

interface TabsContextValue {
  activeValue: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Les composants Tabs doivent être utilisés dans <Tabs>");
  }
  return ctx;
}

// ── Tabs (root) ───────────────────────────────────────────────────────────────

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function TabsList({ children, className }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!list) return;

    const triggers = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    const current = document.activeElement;
    const idx = triggers.indexOf(current as HTMLButtonElement);

    if (idx < 0) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      triggers[(idx + 1) % triggers.length].focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      triggers[(idx - 1 + triggers.length) % triggers.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      triggers[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      triggers[triggers.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={clsx("flex items-center border-b border-line", className)}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, disabled, className }: TabsTriggerProps) {
  const { activeValue, onChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={clsx(
        "relative px-4 py-3 text-xs font-medium font-sans",
        "transition-colors focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isActive ? "text-ink" : "text-ink-muted hover:text-ink-soft",
        className
      )}
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      {children}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue } = useTabsContext();
  const isActive = activeValue === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={clsx("focus:outline-none", className)}
    >
      {children}
    </div>
  );
}

// ── Root avec sous-composants attachés ───────────────────────────────────────

/**
 * Compound component Tabs.
 *
 * Utilisation :
 * ```tsx
 * <Tabs value={tab} onValueChange={setTab}>
 *   <Tabs.List>
 *     <Tabs.Trigger value="a">Onglet A</Tabs.Trigger>
 *     <Tabs.Trigger value="b">Onglet B</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="a">Contenu A</Tabs.Content>
 *   <Tabs.Content value="b">Contenu B</Tabs.Content>
 * </Tabs>
 * ```
 */
function TabsRoot({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeValue: value, onChange: onValueChange }}>
      <div className={clsx("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

TabsRoot.displayName = "Tabs";
TabsList.displayName = "Tabs.List";
TabsTrigger.displayName = "Tabs.Trigger";
TabsContent.displayName = "Tabs.Content";

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
