/**
 * Badge de statut spécifique aux chèques.
 * Affiche status_display avec la couleur sémantique correspondante.
 */
import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { ChequeStatus, ChequeDirection } from "@/lib/types";

export interface ChequeStatusBadgeProps {
  status: ChequeStatus;
  direction: ChequeDirection;
  statusDisplay: string;
  className?: string;
}

function statusVariant(
  status: ChequeStatus,
  direction: ChequeDirection
): BadgeVariant {
  switch (status) {
    case "pending":
      return direction === "in" ? "info" : "warning";
    case "cashed":
      return "positive";
    case "debited":
      return "positive";
    case "rejected":
      return "negative";
    case "cancelled":
      return "negative";
    case "blocked":
      return "warning";
    default:
      return "neutral";
  }
}

export function ChequeStatusBadge({
  status,
  direction,
  statusDisplay,
  className,
}: ChequeStatusBadgeProps) {
  return (
    <Badge
      variant={statusVariant(status, direction)}
      className={className}
    >
      {statusDisplay}
    </Badge>
  );
}
