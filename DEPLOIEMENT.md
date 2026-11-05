# Démo publique d'Amlak (gratuite)

La démo publique présente Amlak sur un portfolio avec des données **fictives** et les
libellés **« Facturé » / « Hors facture »**. L'application privée n'est pas concernée : sans
variables, elle garde « Blanc » / « Noir » (`frontend/src/lib/libelles.ts`,
`LIBELLE_BLANC` / `LIBELLE_NOIR` dans `backend/amlak/settings.py`).

| Rôle | Service | Ce qu'il héberge |
|---|---|---|
| Base de données | **Neon** (PostgreSQL) | données de la démo (`seed_demo_public`) |
| API Django | **Render** (Web Service gratuit) | `backend/`, décrit par `render.yaml` |
| Frontend | **Vercel** | `frontend/` ; `/api/*` est relayé vers Render |

Le relais `/api` par Vercel est nécessaire : le jeton de rafraîchissement est un cookie
httpOnly `SameSite=Lax`, que le navigateur n'enverrait pas à un autre domaine.

## 1. Neon
https://neon.tech → *New project* `amlak-demo` (région Europe) → copier la *connection string*.

## 2. Render
1. *New* → *Blueprint* → ce dépôt.
2. `DATABASE_URL` = la chaîne Neon ; `AMLAK_DEMO_PASSWORD` = mot de passe du compte de démo
   (il est **affiché** sur la page de connexion : n'en choisir aucun qui serve ailleurs).
3. Au démarrage : `migrate`, `seed_demo_public` (idempotente), puis `gunicorn`. Le serveur
   refuse de démarrer sans `DJANGO_SECRET_KEY` (générée par Render).

## 3. Vercel
1. *Add New* → *Project* → ce dépôt, **Root Directory : `frontend`**.
2. Variables :
   - `VITE_API_URL` = `/api/v1`
   - `VITE_LIBELLE_BLANC` = `Facturé`, `VITE_LIBELLE_NOIR` = `Hors facture`
   - `VITE_DEMO_EMAIL` = `demo@amlak-demo.ma`, `VITE_DEMO_PASSWORD` = la valeur de Render.
3. `frontend/vercel.json` relaie `/api/*` vers `https://amlak-demo-api.onrender.com` : si Render
   a donné un autre nom au service, corriger cette adresse.
