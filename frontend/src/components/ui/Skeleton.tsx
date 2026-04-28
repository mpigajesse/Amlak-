import { clsx } from "clsx";

export type SkeletonVariant = "text" | "rect" | "circle";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  /** Largeur CSS (ex: "120px", "100%"). Ignoré si className définit w-* */
  width?: string | number;
  /** Hauteur CSS. Ignoré si className définit h-* */
  height?: string | number;
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: "rounded h-4",
  rect: "rounded-lg",
  circle: "rounded-full",
};

/**
 * Placeholder de chargement.
 *
 * @example
 * ```tsx
 * // Texte
 * <Skeleton variant="text" className="w-32" />
 *
 * // Bloc rectangulaire
 * <Skeleton variant="rect" className="h-10 w-full" />
 *
 * // Avatar
 * <Skeleton variant="circle" className="w-10 h-10" />
 * ```
 */
export function Skeleton({
  variant = "rect",
  className,
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-pulse bg-line",
        variantClasses[variant],
        className
      )}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
    />
  );
}
