# Amlak — Documentation projet

> **Amlak** (أملاك · « biens immobiliers ») · *Pilotage financier pour promotion immobilière*

Application web privée de gestion financière pour promoteur immobilier indépendant.

## 📐 Stack

- **Backend** : Django 5.x + DRF + PostgreSQL 16+ + Celery + Redis
- **Frontend** : React 18 + Vite + TailwindCSS + TanStack Query + React Router v6
- **Langue** : FR, devise MAD, locale fr-MA

---

## 🗂️ Comment lire cette documentation

Cette documentation est **modulaire** : chaque fichier a un scope précis pour minimiser les tokens consommés. Ne charge que ce dont tu as besoin pour la tâche en cours.

**Règles permanentes** → lire systématiquement :
- [`CLAUDE.md`](./CLAUDE.md) — conventions, règles non négociables, style de code

**Contexte général** (à lire avant de commencer) :
- [`00-overview/product.md`](./00-overview/product.md) — le quoi et le pourquoi
- [`00-overview/glossary.md`](./00-overview/glossary.md) — glossaire métier
- [`00-overview/principles.md`](./00-overview/principles.md) — principes directeurs

**Ensuite, lire à la demande selon la tâche** :

### Backend — Django
| Tâche | Fichiers à charger |
|---|---|
| Créer/modifier modèle Project | `01-backend/models/project.md` |
| Créer/modifier modèle Acquisition | `01-backend/models/acquisition.md` |
| Créer/modifier modèle StockUnit | `01-backend/models/stock-unit.md` |
| Créer/modifier modèle Transaction | `01-backend/models/transaction.md` |
| Créer/modifier modèle Cheque | `01-backend/models/cheque.md` |
| Créer/modifier modèle Supplier | `01-backend/models/supplier.md` |
| User, Settings, Notification | `01-backend/models/user-and-meta.md` |
| Endpoints API REST | `01-backend/api/endpoints.md` + `01-backend/api/conventions.md` |
| Services de calcul (position, budget, marges, forecast) | `01-backend/services/calculations.md` |
| Intégration OCR chèques | `01-backend/services/ocr.md` |
| Tâches Celery / notifications | `01-backend/services/notifications.md` |

### Frontend — React
| Tâche | Fichiers à charger |
|---|---|
| Arborescence projet + conventions | `02-frontend/structure.md` |
| Routing + navigation | `02-frontend/routing.md` |
| Data fetching (TanStack Query) | `02-frontend/data-fetching.md` |
| Formulaires (RHF + Zod) | `02-frontend/forms.md` |
| Composants primitives UI | `02-frontend/ui-primitives.md` |
| Composants partagés (BNSplitter, etc.) | `02-frontend/shared-components.md` |

### Design
| Tâche | Fichiers à charger |
|---|---|
| Tokens CSS (couleurs, spacing, radius) | `03-design/tokens.md` |
| Typographie | `03-design/typography.md` |
| Règles composants (boutons, inputs, tables…) | `03-design/components.md` |
| Breakpoints + responsive | `03-design/responsive.md` |
| Icônes (mapping lucide-react) | `03-design/icons.md` |

### Workflows métier
| Tâche | Fichiers à charger |
|---|---|
| Créer un projet | `04-workflows/create-project.md` |
| Kanban cycle Achat | `04-workflows/acquisition-kanban.md` |
| Générer le stock | `04-workflows/generate-stock.md` |
| Réserver / vendre une unité | `04-workflows/sell-unit.md` |
| Saisie rapide de transaction | `04-workflows/quick-transaction.md` |
| Scanner un chèque (OCR) | `04-workflows/ocr-cheque.md` |
| Passer un chèque à encaissé | `04-workflows/cash-cheque.md` |
| Alertes automatiques | `04-workflows/alerts.md` |

### Build & déploiement
| Tâche | Fichiers à charger |
|---|---|
| Plan de construction en sprints | `05-build/sprints.md` |
| Seeding + fixtures démo | `05-build/seeding.md` |
| Tests (pytest + vitest + playwright) | `05-build/testing.md` |
| Sécurité + auth | `05-build/security.md` |
| Déploiement + Docker | `05-build/deployment.md` |

### Marque
| Tâche | Fichiers à charger |
|---|---|
| Identité, taglines, règles d'usage | `06-branding/identity.md` |
| Prompts de génération de logo | `06-branding/logo-prompts.md` |

---

## 🚀 Premier démarrage avec Claude Code

Pour démarrer le projet from scratch, dans l'ordre :

1. `CLAUDE.md` — règles permanentes
2. `00-overview/product.md` — vision
3. `00-overview/glossary.md` — vocabulaire
4. `05-build/sprints.md` — plan de construction
5. Démarrer **Sprint 1** (fondations) — charger les fichiers correspondants

## 📋 Structure complète

```
amlak-docs/
├── README.md                        # Ce fichier
├── CLAUDE.md                        # Règles permanentes
├── 00-overview/
│   ├── product.md
│   ├── glossary.md
│   └── principles.md
├── 01-backend/
│   ├── models/
│   │   ├── project.md
│   │   ├── acquisition.md
│   │   ├── stock-unit.md
│   │   ├── transaction.md
│   │   ├── cheque.md
│   │   ├── supplier.md
│   │   └── user-and-meta.md
│   ├── api/
│   │   ├── conventions.md
│   │   └── endpoints.md
│   └── services/
│       ├── calculations.md
│       ├── ocr.md
│       └── notifications.md
├── 02-frontend/
│   ├── structure.md
│   ├── routing.md
│   ├── data-fetching.md
│   ├── forms.md
│   ├── ui-primitives.md
│   └── shared-components.md
├── 03-design/
│   ├── tokens.md
│   ├── typography.md
│   ├── components.md
│   ├── responsive.md
│   └── icons.md
├── 04-workflows/
│   ├── create-project.md
│   ├── acquisition-kanban.md
│   ├── generate-stock.md
│   ├── sell-unit.md
│   ├── quick-transaction.md
│   ├── ocr-cheque.md
│   ├── cash-cheque.md
│   └── alerts.md
├── 05-build/
│   ├── sprints.md
│   ├── seeding.md
│   ├── testing.md
│   ├── security.md
│   └── deployment.md
└── 06-branding/
    ├── identity.md
    └── logo-prompts.md
```
