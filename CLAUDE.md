# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Instructions permanentes — Amlak

Ce fichier contient les règles non négociables. **Toujours les respecter.**

## ⚠️ État actuel du dépôt

**Ce repo ne contient que de la documentation.** Aucun code n'existe encore — ni `backend/`, ni `frontend/`, ni `docker-compose.yml`. Seulement les specs dans `00-overview/` → `06-branding/`.

Conséquences :
- Il n'y a **pas de commandes de build/test/lint à exécuter aujourd'hui** (elles seront définies au Sprint 1).
- Les outils listés dans la « Stack imposée » décrivent ce que le projet **utilisera**, pas ce qui marche maintenant.
- La structure `amlak/backend/...` en fin de fichier est la cible **à créer**, pas à explorer.
- Avant d'écrire du code, toujours consulter le plan : `05-build/sprints.md`.

## 🎯 Contexte

Projet : **Amlak** — app privée de gestion financière pour promoteur immobilier au Maroc.
Mono-utilisateur pour le MVP mais tous les modèles ont `owner = FK(User)` pour multi-tenant futur.

## 🧭 Architecture conceptuelle (à lire avant tout)

Trois concepts métier sont **transversaux** à tout le code. Les comprendre évite des erreurs structurelles.

### 1. Dualité Blanc / Noir (présente partout)
Chaque `Transaction` et chaque `Cheque` stocke **deux montants** : `amount_blanc` (officiel, traçable) + `amount_noir` (non déclaré, cash). **Le total n'est jamais stocké** — calculé via `@property` Python et reformaté côté frontend. Toute feature impactant les montants doit respecter ce split : saisie (`BNSplitter`), affichage (`MoneyDisplay`), agrégations, filtres, export.

### 2. Cash-first, pas projet-first
La trésorerie est l'entité centrale ; les projets sont des **postes analytiques**. Le dashboard affiche toujours la **position cash** en premier. Une seule poche cash globale (pas de split par banque au MVP).

### 3. Deux cycles métier distincts
- **Cycle Achat** (`Acquisition`) : `Opportunité → Négociation → Promis → Compromis → Réservé → Acheté`
- **Cycle Vente** (`StockUnit`) : `Stock → Réservation → Compromis → Encaissé`

Un `Acquisition` (terrain) génère **N** `StockUnit`s (appartements, magasins) via un workflow de génération de stock (`04-workflows/generate-stock.md`). Les coûts sont ensuite répartis au m² pour calculer la marge unitaire.

### Couches backend
```
View (orchestration) → Serializer (valid. + (dé)sérialisation) → Service (métier pur, core/services/) → Model (ORM + @property)
```
**Règle d'or** : toute logique métier va dans `core/services/` comme fonction pure. Views et serializers orchestrent uniquement.

## 📚 Navigation de la documentation

La doc est **chargée à la demande**. L'index est `README.md` à la racine qui mappe chaque type de tâche aux fichiers à charger. Commencer par là pour identifier les 1-3 fichiers pertinents — ne jamais tout charger.

Entrées critiques :
- `00-overview/product.md` — le quoi et le pourquoi
- `00-overview/glossary.md` — vocabulaire (Blanc, Noir, Compromis, Promis, ICE, …)
- `00-overview/principles.md` — 8 principes pour arbitrer
- `05-build/sprints.md` — plan en 8 sprints
- `01-backend/api/conventions.md` — règles API transverses (montants string, pagination, erreurs, ownership)

## 🏗️ Stack imposée

- **Backend** : Django 5.x + DRF + PostgreSQL 16+ + Celery + Redis
- **Frontend** : React 18 + Vite + TypeScript + TailwindCSS + TanStack Query v5 + React Router v6 + React Hook Form + Zod
- **Auth** : `djangorestframework-simplejwt`
- **Monorepo** : `/backend` + `/frontend` + `docker-compose.yml` racine
- **Gestion deps** : `uv` côté Python, `pnpm` côté JS. Pas npm, pas yarn.
- **Lint** : `ruff` + `black` Python ; `eslint` + `prettier` JS
- **Tests** : `pytest` + `factory-boy` backend ; `vitest` + `@testing-library/react` + `playwright` frontend

## ⚙️ Commandes (futures — après Sprint 1)

À utiliser une fois le code bootstrappé, depuis la racine du monorepo :

```bash
# Démarrer tout (db + redis + backend + frontend + celery)
docker compose up

# Backend (dans backend/)
uv run python manage.py migrate
uv run python manage.py seed_demo           # fixtures démo — smoke test principal
uv run python manage.py createsuperuser
uv run python manage.py runserver
uv run pytest                               # tous les tests
uv run pytest core/tests/test_services.py   # un fichier
uv run pytest -k test_blanc_noir_total      # un test par nom
uv run pytest --cov=core --cov-report=html  # couverture
uv run ruff check . && uv run black .

# Frontend (dans frontend/)
pnpm dev                                    # Vite sur :5173
pnpm build
pnpm test                                   # vitest
pnpm test -- BNSplitter                     # un fichier
pnpm test:e2e                               # playwright
pnpm lint && pnpm format && pnpm typecheck
```

## 🔒 Règles non négociables

### Langue et locale
- Interface **100% française**. Labels, messages d'erreur, placeholders : tout en FR.
- Devise : **MAD** (Dirham). Format : `120 000 DH` (espace comme séparateur de milliers).
- Dates en format français : `24 avr. 2026` ou `24/04/2026` selon contexte.
- Locale JS : `fr-MA`. Locale Python : `fr_MA.UTF-8`.

### Modélisation Blanc / Noir
- Chaque transaction/chèque stocke `amount_blanc` et `amount_noir` séparément (Decimal).
- Le total est **toujours calculé**, jamais stocké.
- Aucun mode « masquer le noir » — c'est un outil privé assumé.
- Validation : `amount_blanc + amount_noir > 0`.

### Argent et décimaux
- **Jamais de `float`** pour l'argent. Toujours `Decimal` backend, `string` en JSON, formatage FR côté frontend.
- Modèles Django : `DecimalField(max_digits=14, decimal_places=2)`.
- API : sérialisation des montants en **string** (évite erreurs float JS).

### Nommage
- **Noms de variables/fonctions/fichiers** : anglais (`Project`, `create_transaction`, `stock-unit.md`).
- **Noms de champs affichés à l'utilisateur** : français (labels, placeholders, messages).
- **Migrations Django** : générées automatiquement, pas à modifier manuellement sauf data-migration.

### Sécurité
- JWT access : 30 min, refresh : 7 jours.
- CORS restreint à l'origine frontend.
- Throttling DRF : 100 req/min/user, 20/min anon.
- **Aucun log** de montants ni de numéros de chèques. Seulement IDs et verbes HTTP.
- Photos chèques : stockage privé + URLs signées 15 min.

### Tests
- Tests obligatoires pour tout nouveau service de calcul (`backend/services/`).
- Tests obligatoires pour chaque endpoint avec logique métier (création de transaction, passage de statut, etc.).
- Objectif couverture : 70%+ sur services + API.
- **Seed demo** : toute commande `manage.py seed_demo` doit fonctionner sans erreur après modifs de modèles.

### Style de code

**Python** :
- Type hints partout sauf tests.
- Services dans `backend/core/services/` = fonctions pures (input, output, pas de side-effects sauf I/O DB explicite).
- Pas de logique métier dans les views — views = orchestration uniquement.
- Noms de fonctions en `snake_case`, classes en `PascalCase`.

**TypeScript/React** :
- `strict: true` dans tsconfig.
- Pas de `any` sauf commenté avec `// @ts-expect-error: raison`.
- Composants en `PascalCase.tsx`. Hooks en `camelCase` avec préfixe `use`.
- Un composant par fichier sauf composants privés utilisés uniquement dans le même fichier.
- Props typées avec interface `XxxProps` exportée.

### Git & commits
- Branches : `main` (prod), `dev` (intégration), `feat/...`, `fix/...`, `chore/...`.
- Commits conventionnels : `feat(projects): add kanban drag and drop`, `fix(cheques): correct BN validation`.
- Un commit = un changement atomique.

## 🚫 Anti-patterns interdits

- `Any` côté TS, `# type: ignore` côté Python sans raison commentée.
- Logique métier dans les Serializers DRF (métier → services).
- Valeurs monétaires en `Number` JS ou `float` Python.
- Polices web autres que : Fraunces (display), IBM Plex Sans (body), JetBrains Mono (nombres). **Pas d'Inter.**
- Emojis utilisés comme icônes dans l'UI. Utiliser `lucide-react`.
- Bordures arrondies type `rounded-3xl` ou plus. Max `rounded-lg` (8px).
- Gradients dans l'UI (sauf cas très ponctuel documenté).
- `alert()`, `confirm()`, `prompt()` natifs. Utiliser les Modals de l'UI kit.
- `localStorage` pour des données sensibles. JWT dans cookies httpOnly ou en mémoire + refresh flow.

## ✅ Règles de développement guidé

Quand on te demande d'implémenter une feature :

1. **Lire les fichiers pertinents** depuis l'index `README.md` — ne charge QUE ce qui est nécessaire.
2. **Ne pas tout coder d'un coup** : implémenter backend d'abord, tester via `curl`/httpie/admin, puis frontend.
3. **Toujours écrire ou mettre à jour les tests** avant de passer à la tâche suivante.
4. **Si un choix ambigu apparaît** : poser la question avant de trancher. Ne pas deviner.
5. **Si une spec semble manquer** : le signaler plutôt que d'inventer. Proposer un choix et demander validation.

## 📁 Structure du repo (à respecter)

```
amlak/
├── backend/
│   ├── manage.py
│   ├── pyproject.toml
│   ├── amlak/                    # config Django (settings, urls, wsgi)
│   ├── core/
│   │   ├── models/               # un fichier par modèle
│   │   ├── serializers/
│   │   ├── views/
│   │   ├── services/             # fonctions pures de calcul
│   │   ├── tasks/                # Celery
│   │   ├── management/commands/  # seed_demo, etc.
│   │   └── tests/
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/                      # voir 02-frontend/structure.md
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── docs/                         # cette documentation
```
