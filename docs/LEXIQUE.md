# Lexique de l'admin

> **Brouillon du 07/10/2026**, rédigé par l'agent rédacteur à partir de tous les textes de l'admin (alors `web/src/texts.ts`, les fiches de l'aide, les e-mails). Les textes sont depuis le 08/10/2026 dans `web/src/texts/en.ts`, la référence, écrite d'abord, et `web/src/texts/fr.ts`, tiré de l'anglais. Les lignes marquées attendent une décision par QCM.
>
> Il fait foi pour tous les textes, en anglais comme en français : la même chose porte le même nom partout. Un mot nouveau s'y ajoute avant d'apparaître dans l'interface. Les agents `.claude/agents/redacteur-fr.md`, `redacteur-en.md` et `relecteur-en.md` le lisent avant chaque travail. Décision : [ADMINISTRATION.md](ADMINISTRATION.md), § 7, « En anglais et en français ».

## Ton

| | Français | English |
|---|---|---|
| Adresse | Tutoiement, direct et chaleureux | « you », direct and warm, American English |
| Titres, boutons, onglets | Majuscule au premier mot, sans point final | Sentence case, no final period |
| Boutons | Un verbe à l'infinitif, deux à quatre mots | A verb, two to four words |
| Messages | Ce qui s'est passé, puis ce qu'on peut faire | What happened, then what you can do |
| Ponctuation | Espace insécable (U+00A0) avant « : ; ! ? » et à l'intérieur des guillemets « », vérifiée par `web/src/texts.test.ts` ; « … » | No space before punctuation; curly quotes “ ” in texts |
| Majuscules | Les noms de section (Médiathèque, Corbeille) et de l'éditeur (Plan, Blocs, Lecture, Édition, Concentration) ; la Corbeille comme lieu aussi (« dans la Corbeille », « restaurer depuis la Corbeille », « La Corbeille est vide ») ; le geste en minuscule (« Mettre à la corbeille », « Vider la corbeille ») | Same nouns capitalized (Media library, Trash, Outline…) |
| Anglais : règles fixées le 07/10/2026 (QCM) | — | “Trash” always capitalized, as a place: “the Trash”, “Move to Trash”, “Empty Trash” (WordPress); Oxford comma in every list (“images, audio, and PDFs”); “e.g.” in placeholders; straight apostrophes ' |

## Lieux de l'admin

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| l'admin | the admin | L'outil web où l'équipe gère l'app. | administration (sauf dans les e-mails), back-office / back office, CMS, dashboard |
| Tableau de bord | Dashboard | Première page après la connexion. | Accueil / Home |
| Blog | Blog | Section des articles et de leurs catégories. | Le Fil / Feed |
| Podcasts | Podcasts | Section des épisodes et de leurs catégories. | Podcasts, Radio / Podcast (au singulier) |
| Pages | Pages | Section des pages simples de l'app (mentions légales…). | — |
| Modèles de bloc | Block templates | Section des modèles réutilisables. | Modèles de blocs, Modèles (seul, dans un titre), gabarits / Patterns, Templates (seul) |
| Médiathèque | Media library | Section de tous les fichiers envoyés. | Médias, bibliothèque / Media (seul), Assets, Files |
| Corbeille | Trash | Ce qu'on supprime y reste 30 jours avant l'effacement. | Poubelle / Bin, Recycle bin |
| La team | Team | Les membres et leurs rôles (un éditeur la lit, seul un admin la gère). Le nom de la section depuis le 09/10/2026 (avant, « Équipe ») ; « l'équipe » reste dans les phrases. | Utilisateurs / Users |
| Paramètres | Settings | Les réglages de toute l'admin (admins seulement). | Configuration / Preferences |
| Mon compte | My account | Le profil de chaque membre (nom, adresse e-mail), sa langue, son format régional, son thème et sa double vérification. « Profil » / « Profile » nomme seulement sa carte du nom et de l'adresse e-mail (10/10/2026). | Profil (seul, pour toute la page) / Profile (alone, for the whole page) |
| Contenus (groupe du menu) | Content | Blog, Podcasts, Pages. | — / Contents |
| Outils (groupe du menu) | Tools | Modèles de bloc, Médiathèque, Corbeille. | — |
| App mobile (groupe du menu) | Mobile app | Les cinq pages qui régleront l'allure de l'app (admins seulement) : Identité, Charte graphique, Formes et fichier, Navigation, Mises en page. | — |
| Identité (page de l'App mobile) | App identity | La marque, les logos et l'écran de chargement de l'app. | — |
| Charte graphique (page de l'App mobile) | Style | Les couleurs, les polices et les éléments de l'app. | — |
| Formes et fichier (page de l'App mobile) | Shapes and file | Les formes de l'app, et sa charte dans un fichier. | — |
| Navigation (page de l'App mobile) | Navigation | Les onglets et les menus de l'app. | — |
| Mises en page (page de l'App mobile) | Layouts | La mise en page des contenus de chaque section de l'app. | — |
| Bientôt | Coming soon | Une page pas encore construite (les pages de l'App mobile). | — |
| Aide | Help | La recherche des fiches d'aide (⌘ K). | Documentation, FAQ / Docs |
| fiche d'aide | help article | Une réponse courte de l'aide. | article (réservé au Blog) / doc, page |
| Site web | Website | Lien du header vers le site du client, et le champ de la carte « Marque » où l'on donne son adresse (sans adresse, pas de lien). | — / Site |
| Avancé | Advanced | Onglet des Paramètres pour les réglages rares : langue, format régional et fuseau horaire de l'admin, noms des sections. | — |
| Noms des sections | Section names | Section d'Avancé où un admin renomme le Blog et les Podcasts pour toute l'équipe. | — |

## Équipe, accès et connexion

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| membre | member | Une personne de l'équipe qui a accès à l'admin. | utilisateur, collaborateur / user |
| rôle | role | Ce qu'un membre peut faire : Admin ou Éditeur. | droits, profil / permissions |
| Admin (rôle) | Admin | Peut tout faire : gérer La team et les Paramètres compris. | administrateur / Administrator, Owner |
| Éditeur (rôle) | Editor | Écrit, publie et range ; lit La team sans la gérer, sans les Paramètres. | rédacteur, auteur / Author, Contributor |
| inviter, invitation | invite, invitation | Un admin ajoute une personne par un e-mail avec un lien valable 10 minutes. | inscription / sign up |
| renvoyer l'invitation | resend invitation | Envoyer un nouveau lien. | relancer / reinvite |
| retirer de l'équipe | remove from team | Supprimer l'accès et le compte d'un membre. | supprimer le membre / delete user |
| se connecter, connexion | sign in, sign-in | Entrer dans l'admin avec un code reçu par e-mail. | login, s'identifier / log in, login |
| se déconnecter | sign out | Quitter l'admin sur ce navigateur. | — / log out |
| code de connexion | sign-in code | Les 6 chiffres reçus par e-mail, valables 10 minutes. | jeton, OTP / token, OTP, magic code |
| double vérification | two-step verification | Le code de l'app du téléphone, demandé à chaque connexion. | 2FA, MFA, A2F / 2FA, MFA |
| app de double vérification | authenticator app | L'app du téléphone qui affiche le code. | — |
| réinitialiser (la double vérification) | reset | Effacer la configuration d'un membre qui a perdu son téléphone. | — |
| Configurée (double vérification) | Set up | État de la double vérification d'un membre. | Activée, Active / Enabled, Active |
| déconnecté | signed out | Remplace « session » dans les messages. | session / session |

## Contenus

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| contenu | content (au compte : item) | Ce que l'équipe écrit et publie : article, épisode, page ou modèle. | publication, post / contents, entry |
| article | post | Contenu du Blog. | billet, actu |
| épisode | episode | Contenu des Podcasts, avec son audio. | émission, podcast / podcast |
| page | page | Contenu simple de l'app, ouvert par son adresse. | — |
| titre | title | Le nom d'un contenu, exigé pour publier. | — / headline |
| catégorie | category | Propre au Blog ou aux Podcasts ; filtre dans l'app. | thème, étiquette / tag |
| image mise en avant | featured image | Image en tête du contenu et vignette des listes de l'app : exigée pour publier un article ou un épisode, facultative pour une page (10/10/2026). | image de présentation (jusqu'au 10/10/2026), vignette (pour nommer l'image elle-même), couverture / cover, thumbnail (for the image itself) |
| vignette | thumbnail | La petite image d'une liste : celle d'un fichier dans la Médiathèque, ou ce que devient l'image mise en avant dans les listes de l'app (10/10/2026). | miniature / — |
| audio (d'un épisode) | audio | Le fichier MP3 ou M4A d'un épisode, exigé pour publier. | son, piste / sound, track |
| adresse de la page | page URL | Ce que l'app demande pour ouvrir une page (`mentions-legales`). | slug, permalien / slug, permalink |
| niveau d'accès | access (« Access » comme titre de champ, comme le « Post access » de Ghost ; « who can read it » dans une phrase) | Qui peut lire : Gratuit ou une formule. | visibilité, droits / visibility, permission |
| Gratuit | Free | Tout le monde peut lire. | public / Public |
| formule | plan | Offre payante, de la moins complète à la plus complète. | abonnement, offre / tier, subscription |
| abonné | subscriber | Lecteur de l'app qui a une formule. | membre (réservé à l'équipe) / member |
| lecteur | reader | Personne qui lit dans l'app. | utilisateur, visiteur / user, visitor |
| réglages (d'un contenu) | settings | Titre, niveau d'accès, catégories, adresse. | paramètres, propriétés / properties |
| ordre (d'une liste) | order | Rang choisi par glisser-déposer, repris par l'app. | tri / sort, rank |

## Éditeur et blocs

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| éditeur | editor | L'écran où l'on écrit un contenu ou un modèle. | builder, constructeur / builder |
| bloc | block | Morceau d'un contenu : Texte, Image ou Encadré. | élément, module / element, component |
| Texte (bloc) | Text | Bloc de texte mis en forme. | Paragraphe / Paragraph |
| Image (bloc) | Image | Bloc qui montre une image de la Médiathèque. | Photo / Photo |
| Encadré (bloc) | Box | Bloc qui regroupe des textes et des images, avec un fond ou une bordure. Le mot « section » ne désigne plus qu'une partie de l'admin. | Section, Boîte / Section, Container, Group |
| intertitre / petit intertitre | heading / subheading | Styles de titre dans un texte. | titre 2, H2 / H2, title |
| Plan | Outline | Colonne de gauche : la liste des blocs, à ranger. | sommaire, structure / layers |
| Blocs (glissière) | Blocks | La glissière qui ajoute un bloc. | bibliothèque / library, inserter |
| Blocs de base | Basic blocks | Texte, Image, Encadré. | — / Core blocks |
| Mes blocs | My blocks | Mises en forme et blocs partagés à insérer. | blocs enregistrés / Saved blocks, Reusable blocks |
| réglages du bloc | block settings | Glissière à droite, pour le bloc choisi. | inspecteur / inspector |
| barre de mise en forme | formatting toolbar | Gras, italique, lien, listes. | mise en forme (seul) / format bar |
| modèle | template | Bloc ou structure réutilisable, de trois types. | gabarit / pattern |
| mise en forme (type de modèle) | preset | Copie déjà mise en forme, à compléter, qui ne suit plus son modèle. | style / style, snippet (pour ce type de modèle ; « Style » reste le nom anglais de la page Charte graphique, 10/10/2026) |
| bloc partagé | synced block | Un seul bloc, identique partout, corrigé une fois dans son modèle. | bloc lié / linked block, reusable block, global block |
| détacher | detach | Faire d'un bloc partagé une copie ordinaire. | délier / unlink |
| point de départ | starter | Modèle qui ouvre un nouveau contenu avec une structure en place. | gabarit / blueprint |
| enregistrer comme modèle | save as template | Créer un modèle à partir de blocs choisis. | — |
| type (de modèle, de fichier) | type | La sorte d'un modèle ou d'un fichier. | sorte, genre / kind, sort |
| texte alternatif | alt text | Phrase qui décrit une image pour qui ne la voit pas. | légende / caption |
| transcription | transcript | Le texte d'un audio, conseillé. | sous-titres / captions |
| point à vérifier | warning | Remarque du plan qui n'empêche pas de publier. | erreur / error |
| Prêt à publier ? | Ready to publish? | Ce qui manque avant de publier. | checklist / checklist |
| enregistrement automatique | autosave | Le brouillon s'enregistre seul. | sauvegarde / backup |
| Édition (mode) | Edit | On écrit dans le téléphone. | — / Write |
| Lecture (mode) | Preview (le duo Edit / Preview ; le téléphone de l'éditeur se dit alors « phone ») | Le contenu comme dans l'app, sans rien modifier. | Aperçu (déjà pris) / Read mode |
| aperçu | preview | Le téléphone de l'éditeur, ou la vignette d'un fichier. | — |
| Concentration | Focus mode | Cache les deux colonnes de l'éditeur. | mode zen / Zen mode |
| Grand texte | Large text | Aperçu avec le texte agrandi du téléphone. | — / Big text |
| prendre, reprendre la main | take over (quelqu'un écrit) / start editing (personne n'écrit) | Devenir la seule personne qui écrit un brouillon. | verrou (à l'écran) / lock, claim |
| lecture seule | read-only | Un brouillon qu'un autre membre écrit. | — / view only |
| libéré (brouillon) | released | Rendu à l'équipe après 30 minutes d'onglet caché. | déverrouillé / unlocked |

## Publication

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| brouillon | draft | La copie de travail d'un contenu ; l'app n'en voit rien. | — / working copy |
| publier | publish | Envoyer dans l'app une copie du brouillon : une nouvelle version. | mettre en ligne (bouton) / push, go live |
| version | version | Copie publiée et numérotée, qui ne change plus. | révision / revision |
| historique | version history | La liste des versions publiées. | — / changelog |
| revenir à cette version | restore this version | Recopier une version dans le brouillon. | restaurer (réservé à la Corbeille) / revert, roll back |
| programmer | schedule | Publier seul au jour et à l'heure choisis, dans le fuseau de l'admin. | planifier / plan |
| annuler la programmation | unschedule | Retirer une publication programmée. | déprogrammer |
| retirer de l'app | unpublish | Ne plus montrer le contenu, en gardant brouillon et historique. | dépublier / hide, take down |
| mettre à jour dans l'app | update in app | Republier seulement un fichier ou un bloc partagé changé. | pousser / push, sync |
| état | status | Où en est un contenu. | statut / state |
| Brouillon | Draft | Jamais publié. | — |
| En ligne | Published | Publié, sans changement depuis. | publié (comme état), dans l'app / Online |
| Modifié | Changed | En ligne, avec un brouillon modifié depuis. | — / Edited, Dirty |
| Retiré | Unpublished | Publié puis retiré. | dépublié / Hidden |
| Programmé | Scheduled | Publication prévue. | planifié / Planned |
| En attente | Waiting | Programmation retardée : quelqu'un écrit le brouillon. | — / On hold |
| En cours | Publishing… | L'heure est passée, la publication n'est pas encore partie. | — |
| Échec | Failed | La publication programmée n'a pas pu partir. | erreur / Error |
| Enregistré le … | Saved … | La date de la dernière modification. | Modifié le (« Modifié » est un état) |

## Fichiers, corbeille et actions communes

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| fichier | file | Image, SVG, Lottie, audio ou PDF de la Médiathèque. | média, ressource / asset |
| fiche (d'un fichier) | file details | Nom, texte alternatif, utilisations, Remplacer. | — / info panel |
| envoyer, envoi | upload | Ajouter des fichiers à la Médiathèque. | importer, télécharger / import |
| fenêtre des envois | uploads panel | Le suivi des envois, en bas à droite. | — / upload queue |
| Prêt | Ready | Fichier vérifié, utilisable. | disponible / Done |
| refusé | rejected | Fichier non accepté après vérification. | — / invalid |
| Utilisé / Non utilisé | In use / Unused | Présent ou absent d'un brouillon et d'une version en ligne. | orphelin / Orphan |
| Public / Protégé | Public / Protected | Lisible par tous, ou par les abonnés concernés. | privé / Private |
| stockage, place occupée | storage, storage used | Ce que les fichiers occupent sur 1 Go. | espace disque / quota |
| poids | size | Taille du fichier en Mo. | — / weight |
| remplacer | replace | Un nouveau fichier du même type à sa place. | changer / swap |
| nettoyer | clean up | Effacer les restes d'envois interrompus. | purger / purge |
| indisponible (fichier) | unavailable | Fichier à la corbeille ou pas encore prêt. | supprimé |
| mettre à la corbeille | Move to Trash | Supprimer en gardant 30 jours pour restaurer. | supprimer, jeter / delete, trash (verbe) |
| restaurer | restore | Faire revenir de la Corbeille. | récupérer / recover, undelete |
| supprimer définitivement | delete permanently | Sans retour possible (Corbeille, catégorie, formule). | effacer définitivement / erase, purge |
| vider la corbeille | Empty Trash | Tout supprimer définitivement. | — |
| élément (de la Corbeille) | item | Fichier ou contenu dans la Corbeille. | objet / object |
| lot (retiré le 08/10/2026) | batch | Ce qui partait ensemble dans la Corbeille et en revenait ensemble ; depuis, chaque élément part et revient seul. | groupe / group |
| effacement automatique | auto-delete | La date où la Corbeille efface un élément. | — / purge |
| supprimer | delete | Sans passer par la Corbeille (un bloc d'un brouillon). | — / remove |
| retirer | remove | Enlever sans détruire (image d'un contenu, logo, lien). | supprimer / delete |
| effacer (un champ) | clear | Vider une recherche, des filtres. | — |
| enregistrer | save | Garder les changements. | sauvegarder, valider / submit |
| annuler (un geste) | undo | Défaire le dernier geste. | — / cancel |
| annuler (une fenêtre) | cancel | Fermer sans rien faire. | — / undo |
| dupliquer | duplicate | Copier un bloc juste après lui. | cloner / clone |
| renommer | rename | Changer un nom. | — |
| monter / descendre | move up / move down | Déplacer d'un rang. | — |
| poignée | drag handle | Prise pour ranger par glisser-déposer. | — / grip |

## Identité et apparence

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| Identité de l'admin | Admin branding | Onglet des Paramètres : marque, écran de connexion, logos. (« Identité de l'app » / « App branding », onglet prévu, n'existe pas : l'app se règle dans le groupe App mobile.) | — / Admin identity |
| marque, nom de la marque | brand, brand name | Le nom affiché partout ; « Ruche » à défaut. Les e-mails, qui ne lisent pas la base, disent « ton administration » / « your admin ». | un nom de client (dans les e-mails) |
| Ruche | Ruche | Nom à défaut. Ne se traduit pas, n'apparaît jamais dans les textes. | — / Hive |
| à défaut | default | Ce qui s'affiche quand rien n'est choisi. | — |
| Initiale(s) | Initials | Une à trois lettres qui remplacent le monogramme tant qu'il n'est pas envoyé ; vide : la première lettre du nom. | — |
| logotype | logo | Le logo complet, à gauche du header et à la connexion. En anglais « logo », dans les titres comme dans les phrases (10/10/2026). | logo (seul) / wordmark, logotype |
| monogramme | icon | Le petit signe de la marque : onglet du navigateur, connexion. En anglais « icon », dans les titres comme dans les phrases (10/10/2026). | favicon, icône / favicon, logomark, monogram |
| monogramme animé | animated icon | Le monogramme de l'écran de connexion (ou de l'écran de chargement de l'app), animé. | — |
| écran de connexion | sign-in screen | La page de connexion. | page de login / login page |
| écran de chargement | loading screen | L'écran de l'app qui suit le tout premier écran figé du démarrage : une image de fond facultative sous un voile, et le monogramme de l'app (App mobile › Identité, 10/10/2026). | écran de démarrage, splash / splash screen, launch screen |
| sortie (de l'écran de chargement) | exit | Comment l'écran de chargement s'ouvre sur l'app, une fois le tour d'animation en cours fini : fondu ou zoom (11/10/2026). | transition / transition |
| fondu | fade | La sortie au départ : l'app apparaît par-dessus l'écran de chargement. | — / crossfade |
| zoom | zoom | La sortie où le monogramme grossit vite et s'ouvre sur l'app. | — |
| ouverture (de l'app) | opening | L'écran de chargement puis sa sortie ; « Rejouer l'ouverture » / « Play the opening » la montre dans le téléphone de l'aperçu. | démarrage (réservé au tout premier écran figé) / launch |
| image de fond | background image | La photo à droite de l'écran de connexion, ou derrière l'écran de chargement de l'app. | — / cover |
| adresse e-mail de contact | contact email | Montrée à qui a perdu son téléphone ou son invitation. | — / support email |
| thème | theme | Clair, Sombre ou Automatique, propre à chaque membre. | mode, apparence / appearance |
| Automatique | System | Suit le thème de l'ordinateur. | Système / Auto |
| palette | palette | Une base et un accent, propres à chaque membre. Les noms des palettes (Neutrine, Pierrange…) ne se traduisent pas, comme Ruche. | couleurs / color scheme |
| décliner (un logo) | adapt | Faire un logo aux couleurs de chaque palette. | — / generate variants |
| langue | language | La langue de l'admin, ou celle d'un membre (Mon compte). | — / locale |
| format régional | regional format | L'écriture des dates, des heures et des nombres, et l'ordre du jour et du mois à la saisie : pour toute l'admin (Avancé) ou pour soi (Mon compte). | — |
| fuseau horaire | time zone | L'heure de toute l'admin (Avancé), Paris au départ ; le même pour toute l'équipe. | — |
| adresse (d'un lien) | URL | Ce vers quoi mène un lien du texte. | — / address |
