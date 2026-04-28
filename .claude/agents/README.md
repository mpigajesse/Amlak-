# Agents Claude Code — Amlak

Ce dossier contient 4 agents spécialisés configurés pour Claude Code. Chaque agent a un rôle précis et une vision limitée de la doc, pour maximiser la concentration et éviter les bavures.

## Les 4 agents

| Agent | Rôle | Touche au code ? | Parallélisable ? |
|---|---|---|---|
| **architecte** | Décompose, planifie, valide la cohérence | ❌ lit seulement | — (orchestre les autres) |
| **backend** | Code Django/DRF/Celery | ✅ `backend/` | ✅ avec `frontend` et `qa` |
| **frontend** | Code React/TS/Tailwind | ✅ `frontend/` | ✅ avec `backend` et `qa` |
| **qa** | Tests, revue, couverture | ✅ fichiers de test + fixes mineurs | ✅ avec tous |

## Workflow recommandé

### Pour une feature complète

```
1. USER → ARCHITECTE
   "Ajoute la possibilité de noter les projets 1-5 étoiles"

2. ARCHITECTE répond avec :
   - Contrat d'API figé
   - Tâches back / front / qa découpées
   - Fichiers de doc à lire par chacun

3. USER lance en PARALLÈLE :
   - Agent BACKEND sur les tâches back
   - Agent FRONTEND sur les tâches front (peut mocker l'API si besoin)
   - Agent QA sur les tests (test-first possible)

4. À mesure que back / front terminent → QA review et lance les suites

5. Si blocage ou contradiction → retour à ARCHITECTE
```

### Pour un bug ou une petite tâche

Skip l'architecte, va directement à l'agent concerné (backend / frontend / qa).

## Comment les invoquer dans Claude Code

Claude Code détecte automatiquement les agents disponibles dans `.claude/agents/`. Tu peux :

### Explicitement
```
@architecte peux-tu découper la feature "notation projets" ?
```

### Implicitement
Claude Code fait le routing tout seul en fonction de la description de l'agent et du prompt.

### En parallèle (Task tool)
```
Lance en parallèle :
- backend : implémente le champ rating selon le contrat ci-dessous
- frontend : implémente le composant StarRating selon le contrat
- qa : écris les tests pour les deux côtés
```

## Coordination entre agents

Les agents ne communiquent pas directement — **tu es le chef d'orchestre**. L'architecte produit le plan, tu déclenches les agents, tu relais les résultats.

**Points de synchronisation importants** :

- L'agent **backend** annonce dans sa réponse finale tout changement de contrat d'API, pour que tu le relaies au frontend
- L'agent **frontend** annonce s'il a besoin d'un endpoint manquant, pour que tu demandes au backend
- L'agent **qa** annonce les échecs de test avec un pointeur vers le fichier à corriger

## Règles communes à tous les agents

Elles sont dans `CLAUDE.md` à la racine de la doc, chargé par tous :

- Pas de Float pour argent — Decimal/string partout
- Pas d'Inter comme font — Fraunces / IBM Plex Sans / JetBrains Mono
- Ownership filter systématique côté backend
- Tokens CSS utilisés via classes Tailwind (jamais de hex en dur)
- Pas d'emoji comme icône — lucide-react exclusivement

## Fichiers de doc par agent

Chaque agent charge à minima les mêmes bases (`CLAUDE.md`, `00-overview/`), puis seulement les fichiers pertinents à sa tâche. Le README racine (`/README.md` de la doc) contient la table de chargement par tâche — les agents y font référence.

## Bonus : démarrage d'un sprint

Exemple de prompt pour démarrer le Sprint 2 :

```
Architecte : lis 05-build/sprints.md et donne-moi le plan détaillé
du Sprint 2 "Entités core & listes". Découpe en tâches back / front / qa
et indique les fichiers à charger pour chacun.
```

Ensuite tu relances back/front/qa en parallèle sur leurs tâches respectives.

---

## Personnalisation

Tu peux éditer ces agents à tout moment :
- Changer leur `description` pour affiner le routing auto
- Restreindre/étendre leurs `tools`
- Ajouter des règles spécifiques à ton contexte

Les fichiers sont des simples Markdown + YAML frontmatter, pas de magie.
