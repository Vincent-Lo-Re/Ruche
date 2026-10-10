# Ruche : l'app mobile

L'app mobile de Ruche (Expo SDK 57, Expo Router, Supabase). **Elle n'est pas encore commencée** : on ne l'attaque qu'une fois l'administration terminée (docs/BONNES-PRATIQUES.md, § 8). Pour l'instant, `src/` n'a qu'un écran vide qui affiche le nom de l'app, et le client Supabase (`src/lib/supabase.ts`).

## Démarrer

1. Copier `.env.example` en `.env` (il pointe vers le Supabase local, démarré à la racine par `npm run db:start`).
2. Installer les dépendances : `npm ci`.
3. Lancer le serveur de dev : `npx expo start`.

## Règles

- Ajouter une dépendance **uniquement** avec `npx expo install <paquet>`, jamais `npm install <paquet>` : c'est Expo qui fixe les versions.
- Les écrans vont dans `src/app/` (Expo Router) ; le reste (composants, hooks, utilitaires) en dehors.
- Seule la clé **publishable** de Supabase va dans l'app.
- Avant de dire « fini » : `npx expo lint` et `npm run typecheck`.
- L'icône est un carré neutre (`#171717`) et l'écran de démarrage un fond blanc, noir en mode sombre : l'identité de l'app se réglera dans le groupe « App mobile » de l'admin.

Les consignes d'Expo pour l'assistant sont dans [AGENTS.md](AGENTS.md) ; versions, commandes et façon de travailler, dans le [CLAUDE.md](../CLAUDE.md) de la racine.
