import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema } from "@/lib/validation";
import type { LoginFormData } from "@/lib/validation";
import type { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import type { AxiosError } from "axios";

/**
 * Page de connexion — Sprint 1.
 * Formulaire RHF + Zod, appel /auth/login/, gestion erreurs API en FR.
 * Access token stocké en mémoire via useAuth().login().
 */
export function LoginPage() {
  useTitle("Connexion");
  const { login, status } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (status === "authed") {
      void navigate("/", { replace: true });
    }
  }, [status, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      void navigate("/", { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const detail = axiosErr.response?.data?.detail;

      setError("root", {
        message: detail ?? "Une erreur est survenue. Veuillez réessayer.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="font-display italic text-5xl text-ink tracking-tight">
            Amlak
          </h1>
          <p className="mt-2 text-sm text-ink-muted font-sans">
            Gestion financière promoteur
          </p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-bg-card border border-line rounded-xl p-6 shadow">
          <h2 className="font-display text-xl text-ink mb-5 tracking-tight">
            Connexion
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">
              {/* Email */}
              <FormField
                label="Adresse email"
                htmlFor="email"
                error={errors.email?.message}
                required
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@amlak.ma"
                  autoComplete="email"
                  autoFocus
                  hasError={!!errors.email}
                  {...register("email")}
                />
              </FormField>

              {/* Mot de passe */}
              <FormField
                label="Mot de passe"
                htmlFor="password"
                error={errors.password?.message}
                required
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  hasError={!!errors.password}
                  {...register("password")}
                />
              </FormField>

              {/* Erreur API */}
              {errors.root && (
                <div
                  role="alert"
                  className="rounded bg-negative/10 border border-negative/20 px-3 py-2.5 text-sm text-negative font-sans"
                >
                  {errors.root.message}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2"
                iconLeft={!isSubmitting ? <LogIn size={16} /> : undefined}
              >
                Se connecter
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
