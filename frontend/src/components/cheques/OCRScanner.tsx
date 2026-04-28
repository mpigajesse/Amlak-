/**
 * Composant OCR Scanner réutilisable.
 * Mobile-first : input caméra natif (capture=environment) + fallback upload desktop.
 * Résultat OCR → callback onResult.
 * Règles sécurité : pas de log du numéro/montants dans les toasts.
 */
import { useRef, useState } from "react";
import { Camera, Upload, RefreshCcw, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useOcrCheque } from "@/api/cheques";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/useToast";
import type { OcrResult } from "@/lib/types";

export interface OCRScannerProps {
  onResult: (result: OcrResult, photoFile: File) => void;
  onManualEntry?: () => void;
  className?: string;
}

type ScanState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; file: File; preview: string };

export function OCRScanner({
  onResult,
  onManualEntry,
  className,
}: OCRScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });
  const ocrMutation = useOcrCheque();
  const toast = useToast();

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou HEIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 10 Mo).");
      return;
    }

    // Préview immédiate
    const preview = URL.createObjectURL(file);
    setScanState({ kind: "loading" });

    try {
      const result = await ocrMutation.mutateAsync(file);
      setScanState({ kind: "done", file, preview });
      onResult(result, file);
    } catch (err: unknown) {
      URL.revokeObjectURL(preview);

      // Rate limit
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 429
      ) {
        setScanState({
          kind: "error",
          message: "Trop de scans rapprochés. Réessayez dans une minute.",
        });
        toast.error("Trop de scans rapprochés. Réessayez dans une minute.");
        return;
      }

      // Fallback silencieux : formulaire vide
      setScanState({
        kind: "error",
        message: "Analyse indisponible, saisissez manuellement.",
      });
      // On appelle quand même onResult avec stub pour ouvrir le formulaire vide
      onResult({ stub: true }, file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input pour permettre re-sélection du même fichier
    e.target.value = "";
  };

  const reset = () => {
    if (scanState.kind === "done") {
      URL.revokeObjectURL(scanState.preview);
    }
    setScanState({ kind: "idle" });
  };

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      {/* Inputs cachés */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileInput}
        aria-label="Prendre une photo"
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileInput}
        aria-label="Choisir une image"
      />

      {/* État idle */}
      {scanState.kind === "idle" && (
        <div className="flex flex-col gap-3">
          {/* Bouton principal : caméra (mobile-first) */}
          <Button
            variant="primary"
            size="lg"
            iconLeft={<Camera size={20} aria-hidden="true" />}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full justify-center"
          >
            Prendre une photo
          </Button>

          {/* Bouton secondaire : upload */}
          <Button
            variant="secondary"
            size="lg"
            iconLeft={<Upload size={18} aria-hidden="true" />}
            onClick={() => uploadInputRef.current?.click()}
            className="w-full justify-center"
          >
            Choisir depuis la galerie
          </Button>

          {onManualEntry && (
            <button
              type="button"
              onClick={onManualEntry}
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink text-center mt-1"
            >
              Saisir manuellement
            </button>
          )}
        </div>
      )}

      {/* État chargement OCR */}
      {scanState.kind === "loading" && (
        <div className="flex flex-col gap-4" aria-live="polite" aria-label="Analyse du chèque en cours…">
          <p className="text-sm text-ink-muted text-center">
            Analyse du chèque en cours…
          </p>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton variant="text" className="w-24" />
                <Skeleton variant="rect" className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État done : thumbnail + indicateur */}
      {scanState.kind === "done" && (
        <div className="flex flex-col gap-3">
          <div className="relative rounded-lg overflow-hidden border border-line">
            <img
              src={scanState.preview}
              alt="Aperçu du chèque scanné"
              className="w-full max-h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="bg-positive text-white text-xs font-medium px-2 py-1 rounded">
                Analyse terminée
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<RefreshCcw size={14} aria-hidden="true" />}
            onClick={reset}
            className="self-center"
          >
            Reprendre la photo
          </Button>
        </div>
      )}

      {/* État erreur */}
      {scanState.kind === "error" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <AlertTriangle
              size={16}
              className="text-warning flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-ink">{scanState.message}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<RefreshCcw size={14} aria-hidden="true" />}
              onClick={reset}
              className="flex-1 justify-center"
            >
              Reprendre
            </Button>
            {onManualEntry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onManualEntry}
                className="flex-1 justify-center"
              >
                Saisie manuelle
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
