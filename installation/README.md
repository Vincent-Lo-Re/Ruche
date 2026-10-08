# Installation : la démo de Ruche

Ce dossier porte les réglages en ligne de la **démo de Ruche** (admin « Ruche » avec des contenus
d'exemple). Il sert aussi de modèle : le dépôt de chaque client a le même dossier, avec ses
valeurs. Le code de Ruche ne nomme aucune installation.

| Fichier | Contenu |
|---|---|
| `supabase.env` | Réglages de connexion (adresse de l'admin, liens des e-mails), lus par `supabase config push` |
| `functions.env` | Réglages des fonctions serveur (adresses de l'admin acceptées), envoyés par `supabase secrets set` |

Aucun secret dans ces fichiers : le dépôt est public.

## La démo de Ruche en ligne

- Admin : https://admin.ruche.website (projet Vercel « ruche », domaine `ruche.website` acheté chez
  Vercel, DNS chez Vercel), aussi https://ruche-nu.vercel.app.
- Base : projet Supabase `lnhjalrrvbokxwimmfxx`.
- E-mails : compte Brevo de Ruche, domaine `ruche.website` authentifié (code Brevo, DKIM `brevo1`
  et `brevo2`, DMARC, dans les DNS de Vercel), expéditeur `ne-pas-repondre@ruche.website`.

## Ce qui se fait tout seul

Le projet Supabase est relié au dépôt GitHub (intégration GitHub, branche `main`, « Deploy to
production »). À chaque fusion dans `main`, Supabase applique les nouvelles migrations et déploie
les fonctions déclarées dans `supabase/config.toml`. Vercel, relié au même dépôt, met l'admin en
ligne.

## Ce qui se fait une fois, à la main

Dans cet ordre, depuis une copie de travail du dépôt sur `main`.

1. **Fermer les inscriptions avant tout** : Authentication › Sign In / Providers, « Allow new users
   to sign up » désactivé (un projet neuf les a ouvertes).
2. **Relier le projet au dépôt** : tableau de bord Supabase › Project Settings › Integrations ›
   GitHub. Dépôt, branche de production `main`, dossier `supabase`, « Deploy to production »
   coché. La première fusion qui suit applique toutes les migrations.
3. **Adresse et clé publishable du projet dans la base** (SQL Editor), pour les tâches planifiées
   (une migration y a écrit d'autres valeurs) :

   ```sql
   update private.settings
   set files_url = 'https://<réf. du projet>.supabase.co/functions/v1/files',
     publishable_key = '<clé sb_publishable_… du projet>'
   where id;
   ```

4. **Réglages de connexion** (le lien GitHub ne les envoie pas) :

   ```bash
   npx supabase link --project-ref <réf. du projet>
   set -a && . installation/supabase.env && set +a && npx supabase config diff
   set -a && . installation/supabase.env && set +a && npx supabase config push
   ```

   Relire le `config diff` d'abord. Le SMTP de l'installation se règle dans le tableau de bord
   **avant** le premier `config push` (sur l'offre gratuite, Supabase refuse de modifier les
   modèles d'e-mails avec son service d'envoi intégré) ; ne jamais le déclarer dans
   `config.toml`.

5. **Réglages des fonctions** : `npx supabase secrets set --env-file installation/functions.env`.
6. **Premier compte admin** : tableau de bord (Authentication › Users › Invite), puis le SQL de
   `docs/ADMINISTRATION.md`, § 2.

Ces réglages ne changent qu'avec l'installation (nouvelle adresse de l'admin…) : on refait alors
l'étape 4 ou 5.
