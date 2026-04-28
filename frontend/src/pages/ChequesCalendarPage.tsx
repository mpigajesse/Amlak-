/**
 * Page calendrier des chèques : /cheques/calendrier
 * Vue mensuelle des dates d'encaissement (cash_date).
 * Charge les chèques de l'année en cours + précédente et suivante.
 */
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChequeCalendar } from "@/components/cheques/ChequeCalendar";
import { Button } from "@/components/ui/Button";
import { useCheques } from "@/api/cheques";
import { ROUTES } from "@/lib/constants";

export function ChequesCalendarPage() {
  useTitle("Calendrier des chèques");
  const navigate = useNavigate();

  // Charge les chèques sur ~14 mois pour couvrir la navigation prev/next
  const year = new Date().getFullYear();
  const from = `${year - 1}-11-01`;
  const to = `${year + 1}-02-28`;

  const chequesQuery = useCheques({
    cash_date_from: from,
    cash_date_to: to,
  });

  const cheques = useMemo(
    () => chequesQuery.data?.results ?? [],
    [chequesQuery.data]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendrier des chèques"
        subtitle={
          chequesQuery.isLoading
            ? "Chargement…"
            : `${cheques.length} chèque(s)`
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ArrowLeft size={14} aria-hidden="true" />}
            onClick={() => navigate(ROUTES.CHEQUES)}
          >
            Retour
          </Button>
        }
      />

      <div className="rounded-lg border border-line bg-bg-card overflow-hidden">
        <ChequeCalendar
          cheques={cheques}
          isLoading={chequesQuery.isLoading}
        />
      </div>
    </div>
  );
}
