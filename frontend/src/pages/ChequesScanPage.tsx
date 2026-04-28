/**
 * Page scan OCR chèque : /cheques/scan
 * Mobile-first. Flux : photo → OCR → formulaire pré-rempli → POST /cheques/ + upload photo.
 * Règle sécurité : aucun log de numéro/montants.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { OCRScanner } from "@/components/cheques/OCRScanner";
import { ChequeForm } from "@/components/cheques/ChequeForm";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/useToast";
import { useCreateCheque } from "@/api/cheques";
import { api } from "@/api/client";
import { ROUTES, BANK_OPTIONS } from "@/lib/constants";
import type { ChequeFormValues } from "@/lib/validation";
import type { OcrResult, BankSlug } from "@/lib/types";

type ScanStep =
  | { kind: "scan" }
  | { kind: "form"; initialValues: Partial<ChequeFormValues>; photoFile: File | null };

/** Mappe un résultat OCR en valeurs initiales de formulaire */
function ocrToFormValues(ocr: OcrResult): Partial<ChequeFormValues> {
  const bankMatch = ocr.bank
    ? BANK_OPTIONS.find((b) => b.value === ocr.bank)
    : undefined;

  return {
    number: ocr.number ?? "",
    bank: (bankMatch?.value ?? "autre") as BankSlug,
    account_holder: ocr.account_holder ?? "",
    // OCR retourne un montant global — mis en blanc par défaut, noir = 0
    amount_blanc: ocr.amount ?? "0",
    amount_noir: "0",
  };
}

export function ChequesScanPage() {
  useTitle("Scanner un chèque");
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<ScanStep>({ kind: "scan" });
  const createCheque = useCreateCheque();

  const handleOcrResult = useCallback(
    (result: OcrResult, photoFile: File) => {
      const initialValues = ocrToFormValues(result);
      setStep({ kind: "form", initialValues, photoFile });
    },
    []
  );

  const handleManualEntry = useCallback(() => {
    setStep({ kind: "form", initialValues: {}, photoFile: null });
  }, []);

  const handleSubmit = async (values: ChequeFormValues) => {
    if (step.kind !== "form") return;

    try {
      const cheque = await createCheque.mutateAsync(values);

      // Upload photo si disponible
      if (step.photoFile && step.photoFile.size > 0) {
        try {
          const form = new FormData();
          form.append("photo_front", step.photoFile);
          await api.post(`/cheques/${cheque.id}/upload-photo/`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {
          // Upload non bloquant
          toast.info("Chèque enregistré. L'upload de la photo a échoué.");
        }
      }

      toast.success("Chèque enregistré.");
      navigate(ROUTES.CHEQUES);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Erreur lors de l'enregistrement.");
      }
    }
  };

  // URL de preview : stable via useMemo + nettoyée à chaque changement de fichier
  const photoPreviewUrl = useMemo(() => {
    if (step.kind === "form" && step.photoFile && step.photoFile.size > 0) {
      return URL.createObjectURL(step.photoFile);
    }
    return null;
  }, [step]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <PageHeader
        title={
          step.kind === "scan" ? "Scanner un chèque" : "Vérifier et enregistrer"
        }
        subtitle={
          step.kind === "scan"
            ? "Prenez une photo ou importez une image"
            : "Vérifiez les informations détectées avant d'enregistrer"
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ArrowLeft size={14} aria-hidden="true" />}
            onClick={() =>
              step.kind === "form"
                ? setStep({ kind: "scan" })
                : navigate(ROUTES.CHEQUES)
            }
          >
            Retour
          </Button>
        }
      />

      {step.kind === "scan" && (
        <div className="p-5 rounded-lg border border-line bg-bg-card">
          <OCRScanner
            onResult={handleOcrResult}
            onManualEntry={handleManualEntry}
          />
        </div>
      )}

      {step.kind === "form" && (
        <div className="rounded-lg border border-line bg-bg-card p-4 md:p-6">
          {/* Miniature photo si disponible */}
          {photoPreviewUrl && (
            <div className="mb-5 rounded-lg overflow-hidden border border-line">
              <img
                src={photoPreviewUrl}
                alt="Aperçu du chèque scanné"
                className="w-full max-h-40 object-cover"
              />
            </div>
          )}

          <ChequeForm
            initialValues={step.initialValues}
            onSubmit={handleSubmit}
            onCancel={() => setStep({ kind: "scan" })}
            isLoading={createCheque.isPending}
          />
        </div>
      )}
    </div>
  );
}
