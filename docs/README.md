# La documentation de Ruche

Le point d'entrée du projet est le [README](../README.md) de la racine. Ici, quel document lire, et quand.

| Document | Rôle | Quand le lire |
|---|---|---|
| [BONNES-PRATIQUES.md](BONNES-PRATIQUES.md) | Les règles de tout changement (façon de travailler, interface, code, base, tests, sécurité). Fait règle. | Avant tout changement |
| [ADMINISTRATION.md](ADMINISTRATION.md) | Les décisions de l'admin, section par section, cochées quand elles sont en place (cité « ADMIN § n »). | Avant de travailler sur `web/` |
| [LEXIQUE.md](LEXIQUE.md) | Les mots du produit, en anglais et en français. Fait foi pour tous les textes. | Avant d'écrire un texte de l'interface |
| [ARCHITECTURE-CONTENUS.md](ARCHITECTURE-CONTENUS.md) | Le modèle de données, la forme des blocs, les règles tenues par la base, les fichiers, ce que lira l'app, et les décisions [D1] à [D49]. | Avant de toucher à la base ou à son contrat avec l'admin |
| [maquettes/](maquettes/) | Maquettes HTML à ouvrir dans un navigateur. | Quand ADMINISTRATION.md y renvoie |

## Ailleurs dans le dépôt

| Fichier | Rôle |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | Versions, commandes, configuration, façon de travailler, mise en production |
| [web/CLAUDE.md](../web/CLAUDE.md) | Où ranger le code de l'admin, et les briques communes |
| [supabase/CLAUDE.md](../supabase/CLAUDE.md) | Migrations, forme des blocs, tests pgTAP, fonctions serveur, tâches planifiées, sauvegarde |
| [mobile/AGENTS.md](../mobile/AGENTS.md) | Consignes d'Expo pour l'app mobile (pas encore commencée) |
| [installation/README.md](../installation/README.md) | La démo en ligne, et les réglages à faire une fois pour chaque installation |

## Les renvois depuis le code

Le code, les migrations et les tests citent ces documents par leur nom, leurs numéros de section (« ARCHITECTURE-CONTENUS.md, § 2.1 », « ADMIN § 4 », « Étape 5 ») et leurs décisions (« [D18] »). On ne renomme pas ces fichiers et on ne renumérote pas leurs sections ; une décision retirée garde son numéro, marquée comme telle.
