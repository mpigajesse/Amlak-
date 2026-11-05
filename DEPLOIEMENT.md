# Démo publique d'Amlak (gratuite, tout sur Render)

La démo publique présente Amlak sur un portfolio avec des données **fictives** et les
libellés **« Facturé » / « Hors facture »**. L'application privée n'est pas concernée : sans
variables, elle garde « Blanc » / « Noir » (`frontend/src/lib/libelles.ts`,
`LIBELLE_BLANC` / `LIBELLE_NOIR` dans `backend/amlak/settings.py`).

| Service | Nom Render | Ce qu'il héberge |
|---|---|---|
| Web Service (Python) | `amlak-demo-api` | API Django, base SQLite sur le disque éphémère |
| Static Site | `amlak-demo` | frontend ; `/api/*` est relayé vers l'API |

Le relais `/api` est nécessaire : le jeton de rafraîchissement est un cookie httpOnly
`SameSite=Lax`, que le navigateur n'enverrait pas à un autre domaine.

**Pourquoi SQLite :** le disque gratuit est effacé à chaque mise en veille (15 min sans
visite). Au réveil, `migrate` puis `seed_demo_public` recréent les données fictives, aux dates
relatives au jour. La démo revient donc seule à son état initial, sans base externe à
entretenir. Le premier chargement après une veille prend environ 30 à 60 s.

## Mise en place

1. Render → *New* → *Blueprint* → ce dépôt.
2. Même valeur pour `AMLAK_DEMO_PASSWORD` (API) et `VITE_DEMO_PASSWORD` (frontend) : elle est
   **affichée** sur la page de connexion, n'en choisir aucune qui serve ailleurs.
3. Le serveur refuse de démarrer sans `DJANGO_SECRET_KEY` (générée par Render).
4. Si Render attribue d'autres noms que `amlak-demo` / `amlak-demo-api`, corriger la règle
   `/api/*` du site statique et `CORS_ALLOWED_ORIGINS`.

`frontend/vercel.json` reste disponible pour un hébergement Vercel du frontend.
