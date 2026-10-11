# Installer Ruche

Ce dossier porte les réglages en ligne de la **démo de Ruche** (admin « Ruche » avec des contenus d'exemple) et la procédure pour installer Ruche chez un client. Le code de Ruche ne nomme aucun client.

**Une installation = un dépôt.** Le dépôt d'un client est une **copie du code de Ruche**, privée, avec son propre dossier `installation/` et son propre bloc de réglages dans `supabase/config.toml`. Ses projets Vercel et Supabase sont reliés à **son** dépôt. Il reçoit une nouvelle version de Ruche par une demande de fusion (« Recevoir une nouvelle version », plus bas). La démo, elle, est reliée directement au dépôt Ruche : elle reçoit chaque fusion en premier.

Aucun secret dans ces fichiers. Les clés secrètes (SMTP, mot de passe de la base, clé secrète de Supabase) se saisissent dans les tableaux de bord et les secrets GitHub, par l'utilisateur lui-même.

## Les réglages de la démo, et où ils sont

| Réglage | Valeur de la démo | Où |
|---|---|---|
| Adresse de l'admin | https://admin.ruche.website (aussi https://ruche-nu.vercel.app) | Vercel (projet `ruche`, domaine acheté et géré chez Vercel) |
| Projet Supabase | `lnhjalrrvbokxwimmfxx` | `[remotes.demo]` de `supabase/config.toml` |
| Liens des e-mails (`site_url`, redirections) | l'admin en ligne et les adresses de test de Vercel | `[remotes.demo.auth]` de `supabase/config.toml` |
| Adresses acceptées par les fonctions | `ADMIN_ORIGINS` | `installation/functions.env` |
| Adresse de `files` et clé publishable, pour les tâches planifiées | celles du projet | table `private.settings` de la base (étape 3) |
| Requête quotidienne contre la pause | adresse et clé publishable du projet | `.github/workflows/garder-actif.yml` |
| E-mails | compte Brevo de Ruche, domaine `ruche.website`, expéditeur `ne-pas-repondre@ruche.website` | Brevo, DNS chez Vercel, SMTP dans Supabase |
| Sentry | pas encore de projet : rien n'est envoyé | variables de Vercel (étape 7) |
| Sauvegarde | désactivée (le dépôt Ruche est public) | `.github/workflows/sauvegarde.yml` |

| Fichier | Contenu |
|---|---|
| `functions.env` | Les adresses de l'admin acceptées par les fonctions `equipe` et `files`, envoyées par `supabase secrets set` |

## Installer Ruche pour un client

Dans cet ordre : d'abord le dépôt (A à C), puis les services (1 à 9). Les commandes de production (`config push`, `secrets set`) sont lancées par l'utilisateur.

### Le dépôt

A. **Créer le dépôt du client, privé**, comme copie de Ruche à une version donnée (une étiquette `vX.Y.Z` du dépôt Ruche) :

   ```bash
   git clone --branch vX.Y.Z git@github.com:Vincent-Lo-Re/Ruche.git <client>
   cd <client>
   git switch -c main
   git remote rename origin ruche
   git remote add origin git@github.com:<compte>/<client>.git
   git push -u origin main
   ```

   Le dépôt garde Ruche comme source (`ruche`) pour les versions suivantes. Il doit être **privé** : la sauvegarde y range les données dans des artifacts.

B. **Réglages GitHub du dépôt** :
   - règle `main` (Settings › Rules › Rulesets) : demande de fusion obligatoire, Squash seulement, les quatre garde-fous exigés (Administration, Base de données, Fonctions serveur, Parcours), ni suppression ni poussée forcée ;
   - fusion : Squash seulement, avec le titre et la description de la demande, branche supprimée après ;
   - alertes Dependabot actives.

C. **Ses réglages à lui**, dans sa copie :
   - `installation/functions.env` : les adresses de son admin (`ADMIN_ORIGINS`) ;
   - `supabase/config.toml` : remplacer le bloc `[remotes.demo]` par le sien, `[remotes.<client>]`, au `project_id` de son projet Supabase (étape 1), avec son `site_url` et ses `additional_redirect_urls`. Garder les réglages d'origine du projet repris dans le bloc (pooler, stockage) : sans eux, `config push` les remplacerait par les valeurs locales ;
   - `.github/workflows/garder-actif.yml` : l'adresse et la clé publishable de son projet (à retirer quand il passe à l'offre Pro) ;
   - ce `README.md` : le tableau de ses réglages.

### Supabase

1. **Créer le projet**, puis **fermer les inscriptions avant tout** : Authentication › Sign In / Providers, « Allow new users to sign up » désactivé (un projet neuf les a ouvertes).

2. **Relier le projet au dépôt du client** : Project Settings › Integrations › GitHub. Dépôt du client, branche de production `main`, dossier de travail `.` (la racine du dépôt, qui contient `supabase/`), « Deploy to production » coché. La fusion suivante applique toutes les migrations et déploie les fonctions déclarées dans `supabase/config.toml`. **Attendre qu'elle soit passée** avant les étapes 3 et 6 : elles ont besoin des tables.

3. **Adresse et clé publishable du projet dans la base** (SQL Editor), pour les tâches planifiées (une migration y a écrit des valeurs d'attente) :

   ```sql
   update private.settings
   set files_url = 'https://<réf. du projet>.supabase.co/functions/v1/files',
     publishable_key = '<clé sb_publishable_… du projet>'
   where id;
   ```

### Les e-mails

4. **Brevo** (ou un autre service SMTP) : authentifier le domaine du client (code Brevo, DKIM, DMARC, dans ses DNS), créer l'expéditeur (`ne-pas-repondre@<domaine>`), puis l'utilisateur crée la clé SMTP et la colle dans les réglages SMTP du projet Supabase. **Avant le premier `config push`** : sur l'offre gratuite, Supabase refuse de modifier les modèles d'e-mails avec son service d'envoi intégré. Ne jamais déclarer `[auth.email.smtp]` dans `config.toml` : un `config push` effacerait ce réglage.

### Les réglages de connexion et des fonctions

5. **Pousser les réglages** (le lien GitHub ne les envoie pas) :

   ```bash
   npx supabase link --project-ref <réf. du projet>
   npx supabase config diff
   npx supabase config push
   npx supabase secrets set --env-file installation/functions.env
   ```

   Relire le `config diff` d'abord : sa première ligne doit dire « using [remotes.<client>] ». Les variables `SUPABASE_<SECTION>_<CLÉ>` ne sont pas lues par la CLI 2.120.

6. **Premier compte admin** : tableau de bord (Authentication › Users › Invite), puis le SQL de `docs/ADMINISTRATION.md`, § 2.

### L'admin en ligne

7. **Vercel** : un projet relié au dépôt du client, dossier `web`, avec ses variables :
    - `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (la clé **publishable** seulement), saisies à la main : pas d'intégration Supabase–Vercel, qui copierait la clé secrète et le mot de passe de la base ;
    - au besoin `VITE_DEFAULT_LANGUAGE` (l'anglais sinon), `VITE_SENTRY_DSN` et `VITE_SENTRY_ENVIRONMENT` (vides : rien n'est envoyé) ;
    - le domaine de l'admin ;
    - Deployment Checks : « Administration » et « Base de données », pour ne mettre en production que si ces garde-fous sont verts.

    Une adresse de l'admin nouvelle s'ajoute à `ADMIN_ORIGINS` (étape 5, `secrets set`) et aux redirections du bloc `[remotes.<client>]` (`config push`). L'offre gratuite de Vercel (Hobby) est réservée à un usage non commercial : un client demande l'offre Pro.

8. **Sentry** (facultatif) : un projet par installation, données en Europe, sans adresse IP ni données personnelles (docs/ADMINISTRATION.md, § 8) ; son identifiant va dans `VITE_SENTRY_DSN` (étape 7).

9. **Sauvegarde** : secret GitHub `SUPABASE_DB_URL` du dépôt du client (chaîne « Session pooler », mot de passe compris, saisie par l'utilisateur), puis activer « Sauvegarde de la base » dans Actions.

Ces réglages ne changent qu'avec l'installation (nouvelle adresse de l'admin…) : on refait alors l'étape 5.

## Recevoir une nouvelle version de Ruche

Dans le dépôt du client :

```bash
git fetch ruche --tags
git switch -c version-vX.Y.Z
git merge vX.Y.Z
git push -u origin version-vX.Y.Z
```

Puis une demande de fusion dans le dépôt du client. Un conflit ne peut venir que de ses réglages (`installation/`, son bloc dans `config.toml`, `garder-actif.yml`) : on garde les siens. Quand les garde-fous sont verts, la fusion met la version en ligne : Supabase applique les migrations et déploie les fonctions, Vercel l'admin.

**À savoir** :
- Ruche n'a pas encore de version étiquetée : la première se crée avant d'installer le premier client.
- Une version qui contient une migration et l'admin qui s'en sert arrive en une seule fusion : la base et l'admin partent en même temps, alors que Ruche les fusionne en deux fois (docs/BONNES-PRATIQUES.md, § 1). Une version se reçoit donc de préférence quand elle est déjà en ligne sur la démo, et on vérifie après la fusion que l'admin du client répond.
