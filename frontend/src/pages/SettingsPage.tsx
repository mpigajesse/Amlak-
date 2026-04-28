import { useState, useId, type ReactNode } from "react";
import { useTitle } from "@/hooks/useTitle";
import { User, Bell, Lock, Monitor, Trash2, Save, X } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";

// ── Types mock ──────────────────────────────────────────────────────────────

interface ProfileFormValues {
  first_name: string;
  last_name: string;
  email: string;
  locale: string;
}

interface NotificationsFormValues {
  notifications_enabled: boolean;
  min_cash_threshold: string;
  cheque_due_days: string;
  budget_alert_percent: string;
}

interface SecurityFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface DisplayFormValues {
  theme: "light" | "dark" | "auto";
  compact_amounts: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const LOCALE_OPTIONS = [
  { value: "fr-MA", label: "Français (Maroc)" },
  { value: "fr-FR", label: "Français (France)" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "auto", label: "Automatique (système)" },
];

/** Format date en français : 24 avr. 2026 */
function formatDateFr(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sous-composants ─────────────────────────────────────────────────────────

interface SectionTitleProps {
  children: ReactNode;
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h3 className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans mb-4 pt-1 border-t border-line">
      {children}
    </h3>
  );
}

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ id, checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-sans text-ink font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-ink-muted font-sans">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          backgroundColor: checked ? "var(--accent)" : "var(--line-strong)",
          transitionDuration: "var(--transition-fast)",
        }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-bg-elevated shadow-sm transition-transform"
          style={{
            left: checked ? "calc(100% - 1.25rem)" : "0.25rem",
            transitionDuration: "var(--transition-fast)",
          }}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? "Activé" : "Désactivé"}</span>
      </button>
    </div>
  );
}

// ── Onglet Profil ─────────────────────────────────────────────────────────

interface ProfileTabProps {
  initialValues: ProfileFormValues;
}

function ProfileTab({ initialValues }: ProfileTabProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const localeId = useId();

  function handleChange(field: keyof ProfileFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  function handleCancel() {
    setValues(initialValues);
    setIsDirty(false);
  }

  function handleSave() {
    setIsSaving(true);
    // TODO: PATCH /auth/me/ — endpoint non disponible Sprint 1
    setTimeout(() => {
      setIsSaving(false);
      setIsDirty(false);
    }, 600);
  }

  return (
    <div className="space-y-4 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Prénom" htmlFor={firstNameId} required>
          <Input
            id={firstNameId}
            value={values.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            placeholder="Votre prénom"
          />
        </FormField>
        <FormField label="Nom" htmlFor={lastNameId} required>
          <Input
            id={lastNameId}
            value={values.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            placeholder="Votre nom"
          />
        </FormField>
      </div>
      <FormField
        label="Adresse e-mail"
        htmlFor={emailId}
        hint="L'e-mail ne peut pas être modifié."
      >
        <Input
          id={emailId}
          value={values.email}
          readOnly
          aria-readonly="true"
        />
      </FormField>
      <FormField label="Locale" htmlFor={localeId}>
        <Select
          id={localeId}
          value={values.locale}
          onChange={(value) => handleChange("locale", value)}
          options={LOCALE_OPTIONS}
        />
      </FormField>

      {isDirty && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button
            variant="ghost"
            onClick={handleCancel}
            iconLeft={<X size={14} aria-hidden="true" />}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            iconLeft={!isSaving ? <Save size={14} aria-hidden="true" /> : undefined}
          >
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Onglet Notifications ──────────────────────────────────────────────────

function NotificationsTab() {
  const [values, setValues] = useState<NotificationsFormValues>({
    notifications_enabled: true,
    min_cash_threshold: "50000",
    cheque_due_days: "7",
    budget_alert_percent: "90",
  });
  const [isSaving, setIsSaving] = useState(false);
  const cashId = useId();
  const daysId = useId();
  const percentId = useId();

  function handleToggle(checked: boolean) {
    setValues((prev) => ({ ...prev, notifications_enabled: checked }));
  }

  function handleChange(field: keyof NotificationsFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    setIsSaving(true);
    // TODO: PATCH /auth/me/ avec { settings: { notifications_enabled, alert_thresholds } }
    setTimeout(() => setIsSaving(false), 600);
  }

  return (
    <div className="py-5 space-y-5">
      <Toggle
        id="notifications-toggle"
        checked={values.notifications_enabled}
        onChange={handleToggle}
        label="Activer les notifications"
        description="Recevoir des alertes pour les chèques à venir et les budgets dépassés."
      />

      <SectionTitle>Seuils d'alertes</SectionTitle>

      <div
        className={values.notifications_enabled ? "" : "opacity-50 pointer-events-none"}
        aria-hidden={!values.notifications_enabled}
      >
        <div className="space-y-4">
          <FormField
            label="Solde minimum de trésorerie (DH)"
            htmlFor={cashId}
            hint="Alerte si la trésorerie descend en dessous de ce montant."
          >
            <Input
              id={cashId}
              type="number"
              min="0"
              step="1000"
              value={values.min_cash_threshold}
              onChange={(e) => handleChange("min_cash_threshold", e.target.value)}
              placeholder="Ex. : 50 000"
            />
          </FormField>
          <FormField
            label="Alertes chèques avant échéance (jours)"
            htmlFor={daysId}
            hint="Recevoir une alerte ce nombre de jours avant la date d'encaissement d'un chèque."
          >
            <Input
              id={daysId}
              type="number"
              min="1"
              max="30"
              value={values.cheque_due_days}
              onChange={(e) => handleChange("cheque_due_days", e.target.value)}
              placeholder="Ex. : 7"
            />
          </FormField>
          <FormField
            label="Alerte budget consommé (%)"
            htmlFor={percentId}
            hint="Alerte quand ce pourcentage du budget d'un projet est atteint."
          >
            <Input
              id={percentId}
              type="number"
              min="50"
              max="100"
              value={values.budget_alert_percent}
              onChange={(e) => handleChange("budget_alert_percent", e.target.value)}
              placeholder="Ex. : 90"
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-line">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          iconLeft={!isSaving ? <Save size={14} aria-hidden="true" /> : undefined}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ── Onglet Sécurité ───────────────────────────────────────────────────────

function SecurityTab() {
  const [values, setValues] = useState<SecurityFormValues>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Partial<SecurityFormValues>>({});
  const [isSaving, setIsSaving] = useState(false);
  const currentPwdId = useId();
  const newPwdId = useId();
  const confirmPwdId = useId();

  function handleChange(field: keyof SecurityFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<SecurityFormValues> = {};
    if (!values.current_password) {
      newErrors.current_password = "Le mot de passe actuel est requis.";
    }
    if (!values.new_password || values.new_password.length < 8) {
      newErrors.new_password = "Le nouveau mot de passe doit comporter au moins 8 caractères.";
    }
    if (values.new_password !== values.confirm_password) {
      newErrors.confirm_password = "Les mots de passe ne correspondent pas.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setIsSaving(true);
    // TODO: POST /auth/change-password/ — endpoint non disponible Sprint 1
    setTimeout(() => {
      setIsSaving(false);
      setValues({ current_password: "", new_password: "", confirm_password: "" });
    }, 600);
  }

  return (
    <div className="py-5 space-y-4">
      <SectionTitle>Changer le mot de passe</SectionTitle>
      <FormField
        label="Mot de passe actuel"
        htmlFor={currentPwdId}
        error={errors.current_password}
        required
      >
        <Input
          id={currentPwdId}
          type="password"
          value={values.current_password}
          onChange={(e) => handleChange("current_password", e.target.value)}
          placeholder="Mot de passe actuel"
          hasError={!!errors.current_password}
          autoComplete="current-password"
        />
      </FormField>
      <FormField
        label="Nouveau mot de passe"
        htmlFor={newPwdId}
        error={errors.new_password}
        hint="Minimum 8 caractères."
        required
      >
        <Input
          id={newPwdId}
          type="password"
          value={values.new_password}
          onChange={(e) => handleChange("new_password", e.target.value)}
          placeholder="Nouveau mot de passe"
          hasError={!!errors.new_password}
          autoComplete="new-password"
        />
      </FormField>
      <FormField
        label="Confirmer le nouveau mot de passe"
        htmlFor={confirmPwdId}
        error={errors.confirm_password}
        required
      >
        <Input
          id={confirmPwdId}
          type="password"
          value={values.confirm_password}
          onChange={(e) => handleChange("confirm_password", e.target.value)}
          placeholder="Confirmer le mot de passe"
          hasError={!!errors.confirm_password}
          autoComplete="new-password"
        />
      </FormField>

      <div className="flex justify-end pt-2 border-t border-line">
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSaving}
          iconLeft={!isSaving ? <Lock size={14} aria-hidden="true" /> : undefined}
        >
          Mettre à jour
        </Button>
      </div>
    </div>
  );
}

// ── Onglet Préférences d'affichage ────────────────────────────────────────

function DisplayTab() {
  const [values, setValues] = useState<DisplayFormValues>({
    theme: "light",
    compact_amounts: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const themeId = useId();

  function handleSave() {
    setIsSaving(true);
    // TODO: PATCH /auth/me/ avec { settings: { theme, compact_amounts } }
    setTimeout(() => setIsSaving(false), 600);
  }

  return (
    <div className="py-5 space-y-5">
      <SectionTitle>Apparence</SectionTitle>
      <FormField label="Thème" htmlFor={themeId}>
        <Select
          id={themeId}
          value={values.theme}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, theme: value as DisplayFormValues["theme"] }))
          }
          options={THEME_OPTIONS}
        />
      </FormField>
      <Toggle
        id="compact-amounts"
        checked={values.compact_amounts}
        onChange={(checked) => setValues((prev) => ({ ...prev, compact_amounts: checked }))}
        label="Affichage compact des montants"
        description="Afficher les montants abrégés (120 k DH au lieu de 120 000 DH)."
      />
      <FormField
        label="Devise par défaut"
        htmlFor="currency-readonly"
        hint="La devise MAD (Dirham marocain) est fixée pour cette version."
      >
        <Input id="currency-readonly" value="MAD — Dirham marocain" readOnly aria-readonly="true" />
      </FormField>

      <div className="flex justify-end pt-2 border-t border-line">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          iconLeft={!isSaving ? <Save size={14} aria-hidden="true" /> : undefined}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ── Onglet Compte ─────────────────────────────────────────────────────────

interface AccountTabProps {
  email: string;
  createdAt: string;
  lastLogin: string;
}

function AccountTab({ email, createdAt, lastLogin }: AccountTabProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmId = useId();

  const isConfirmValid = confirmText.trim().toLowerCase() === "supprimer";

  function handleDeleteConfirm() {
    if (!isConfirmValid) return;
    setIsDeleting(true);
    // TODO: DELETE /auth/me/ — endpoint non disponible Sprint 1
    setTimeout(() => {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }, 800);
  }

  return (
    <div className="py-5 space-y-5">
      <SectionTitle>Informations du compte</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2.5 border-b border-line">
          <span className="text-xs text-ink-muted font-sans uppercase tracking-[0.08em]">Adresse e-mail</span>
          <span className="text-sm font-sans text-ink font-mono">{email}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-line">
          <span className="text-xs text-ink-muted font-sans uppercase tracking-[0.08em]">Compte créé le</span>
          <span className="text-sm font-sans text-ink">{formatDateFr(createdAt)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-line">
          <span className="text-xs text-ink-muted font-sans uppercase tracking-[0.08em]">Dernière connexion</span>
          <span className="text-sm font-sans text-ink">{formatDateFr(lastLogin)}</span>
        </div>
      </div>

      <SectionTitle>Zone dangereuse</SectionTitle>
      <Card className="border-negative/30">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-sans text-ink font-medium">Supprimer mon compte</p>
              <p className="text-xs text-ink-muted font-sans mt-1">
                Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteModalOpen(true)}
              iconLeft={<Trash2 size={14} aria-hidden="true" />}
            >
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConfirmText("");
        }}
        title="Supprimer mon compte"
        size="sm"
        disableBackdropClose
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteModalOpen(false);
                setConfirmText("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!isConfirmValid}
              loading={isDeleting}
              iconLeft={!isDeleting ? <Trash2 size={14} aria-hidden="true" /> : undefined}
            >
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-sans text-ink">
            Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées :
            projets, transactions, chèques, fournisseurs.
          </p>
          <FormField
            label="Tapez « supprimer » pour confirmer"
            htmlFor={confirmId}
            required
          >
            <Input
              id={confirmId}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="supprimer"
              hasError={confirmText.length > 0 && !isConfirmValid}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────

const SETTINGS_TABS = [
  { value: "profil", label: "Profil", icon: User },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "securite", label: "Sécurité", icon: Lock },
  { value: "affichage", label: "Affichage", icon: Monitor },
  { value: "compte", label: "Compte", icon: User },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

/**
 * Page Réglages — squelette UX complet.
 * Données mock en attendant les endpoints PATCH /auth/me/ (Sprint 7+).
 */
export function SettingsPage() {
  useTitle("Réglages");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");

  // Valeurs initiales basées sur l'utilisateur authentifié ou mock
  const profileInitial: ProfileFormValues = {
    first_name: user?.first_name ?? "Sohaib",
    last_name: user?.last_name ?? "Baroud",
    email: user?.email ?? "sohaib@exemple.ma",
    locale: user?.locale ?? "fr-MA",
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl text-ink tracking-tight">
          Réglages
        </h1>
        <p className="mt-1 text-sm text-ink-muted font-sans">
          Gérez votre profil, vos préférences et la sécurité de votre compte.
        </p>
      </div>

      {/* Conteneur principal */}
      <Card>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SettingsTab)}
        >
          <Tabs.List className="px-5">
            {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
              <Tabs.Trigger key={value} value={value}>
                <span className="flex items-center gap-1.5">
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="px-5">
            <Tabs.Content value="profil">
              <ProfileTab initialValues={profileInitial} />
            </Tabs.Content>

            <Tabs.Content value="notifications">
              <NotificationsTab />
            </Tabs.Content>

            <Tabs.Content value="securite">
              <SecurityTab />
            </Tabs.Content>

            <Tabs.Content value="affichage">
              <DisplayTab />
            </Tabs.Content>

            <Tabs.Content value="compte">
              <AccountTab
                email={user?.email ?? "sohaib@exemple.ma"}
                // TODO: récupérer date_joined et last_login depuis /auth/me/ étendu
                createdAt="2025-01-15T10:00:00Z"
                lastLogin="2026-04-24T08:30:00Z"
              />
            </Tabs.Content>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
