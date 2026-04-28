/**
 * Upload de photos recto/verso d'un chèque existant.
 * Affiche les previews via URL signée (photo_front_url / photo_back_url).
 * Pas de stockage blob long terme en state — URLs signées courte durée.
 */
import { useRef } from "react";
import { Upload, Image as ImageIcon, RefreshCcw } from "lucide-react";
import { clsx } from "clsx";
import { useUploadChequePhoto } from "@/api/cheques";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/useToast";

export interface ChequePhotoUploaderProps {
  chequeId: number;
  photoFrontUrl: string | null;
  photoBackUrl: string | null;
  className?: string;
}

interface PhotoSlotProps {
  label: string;
  existingUrl: string | null;
  onSelect: (file: File) => void;
  isLoading?: boolean;
}

function PhotoSlot({ label, existingUrl, onSelect, isLoading }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted">
        {label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
        aria-label={`Sélectionner ${label.toLowerCase()}`}
      />
      {existingUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-line">
          <img
            src={existingUrl}
            alt={`Photo ${label.toLowerCase()} du chèque`}
            className="w-full max-h-40 object-cover"
          />
          <div className="absolute bottom-0 right-0 p-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              aria-label={`Remplacer ${label.toLowerCase()}`}
              title="Remplacer"
            >
              <RefreshCcw size={12} aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className={clsx(
            "flex flex-col items-center justify-center gap-2",
            "h-32 rounded-lg border-2 border-dashed border-line",
            "hover:border-accent hover:bg-accent-bg/30",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "text-ink-muted"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        >
          <ImageIcon size={24} aria-hidden="true" />
          <span className="text-xs">
            <Upload size={12} className="inline mr-1" aria-hidden="true" />
            Ajouter {label.toLowerCase()}
          </span>
        </button>
      )}
    </div>
  );
}

export function ChequePhotoUploader({
  chequeId,
  photoFrontUrl,
  photoBackUrl,
  className,
}: ChequePhotoUploaderProps) {
  const uploadMutation = useUploadChequePhoto(chequeId);
  const toast = useToast();

  const handleUpload = async (side: "front" | "back", file: File) => {
    try {
      await uploadMutation.mutateAsync(
        side === "front" ? { front: file } : { back: file }
      );
      toast.success("Photo enregistrée.");
    } catch {
      toast.error("Erreur lors de l'envoi de la photo.");
    }
  };

  return (
    <div className={clsx("grid grid-cols-2 gap-4", className)}>
      <PhotoSlot
        label="Recto"
        existingUrl={photoFrontUrl}
        onSelect={(file) => handleUpload("front", file)}
        isLoading={uploadMutation.isPending}
      />
      <PhotoSlot
        label="Verso"
        existingUrl={photoBackUrl}
        onSelect={(file) => handleUpload("back", file)}
        isLoading={uploadMutation.isPending}
      />
    </div>
  );
}
