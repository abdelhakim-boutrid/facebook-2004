# Retrobook — édition 2005

Réseau social indépendant inspiré de Facebook en 2005. Interface française, bleu et blanc, profils en colonnes, annuaire, demandes d’amis, mur, messages privés et pokes. Ni affiliation à Meta, ni connexion aux comptes Facebook. Le code original et les données historiques de Facebook ne sont pas inclus.

## Stack et données

- Vite + JavaScript, hébergement statique sur Vercel.
- Supabase Auth : inscription, connexion, confirmation e-mail, déconnexion, réinitialisation du mot de passe.
- PostgreSQL : profils, amitiés, publications, messages, pokes ; permissions Row Level Security côté serveur.
- Photos de profil réduites à 400 pixels et stockées en JPEG dans PostgreSQL (pas de bucket à configurer).
- Aucun compte fictif dans la base réelle. L’aperçu `/#demo` est explicitement séparé et non modifiable.
- Pas d’algorithme de recommandation, de tracking, de flux d’actualité ou de données locales simulant un réseau réel.

## Mise en route

Prérequis : Node.js 22+, un projet Supabase et un compte Vercel.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Renseigner dans `.env.local` :

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

La clé anon/publishable est publique et conçue pour le navigateur. Ne jamais utiliser de clé `service_role` ou `secret` ici. Sans variables, seule la visite de l’aperçu est disponible ; les formulaires de comptes ne prétendent pas enregistrer de données.

### 1. Configurer Supabase

1. Créer un projet, choisir la région adaptée à vos utilisateurs.
2. Dans SQL Editor, exécuter **une seule fois** `supabase/migrations/001_initial.sql`. Le script est transactionnel et s’adresse à un projet vierge. Pour un projet géré avec Supabase CLI, les migrations sont dans le dossier standard.
3. Dans Authentication → Providers, activer Email et la confirmation des e-mails. Configurer un mot de passe minimum de 12 caractères.
4. Dans Authentication → URL Configuration, renseigner l’URL définitive du site comme Site URL. Autoriser `https://VOTRE-DOMAINE/` et `https://VOTRE-DOMAINE/#reset` ; ajouter les équivalents locaux pour le développement.
5. Configurer un fournisseur SMTP dans Supabase pour envoyer les confirmations et réinitialisations à vos amis. Les restrictions de l’expéditeur de test Supabase ne conviennent pas à un lancement public. Régler les limites d’envoi et d’authentification dans le tableau de bord.
6. Copier l’URL du projet et la clé publique depuis les paramètres API.

### 2. Déployer sur Vercel

1. Pousser ce dossier à la racine du dépôt GitHub choisi.
2. Importer le dépôt dans Vercel, preset **Vite**, Node.js **22**.
3. Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables Vercel des environnements souhaités.
4. Déployer. `vercel.json` configure le build, le dossier `dist` et les en-têtes de sécurité.
5. Reporter le domaine Vercel dans Supabase comme indiqué ci-dessus.

Une modification des variables `VITE_*` nécessite un nouveau build. Chaque push sur la branche de production déclenche ensuite un déploiement Vercel avec l’intégration Git. Les migrations de base se font séparément et ne sont pas exécutées par le navigateur ni par le build.

### 3. Vérifier avec deux vrais comptes

- Créer Alice et Bob dans deux navigateurs ou une fenêtre privée ; confirmer les deux e-mails.
- Compléter les profils, charger une photo, rechercher Bob depuis Alice.
- Envoyer une demande : Alice ne peut pas accepter sa propre demande.
- Accepter chez Bob, publier sur le mur, envoyer et lire un message dans l’autre session.
- Créer Carol : elle ne doit voir ni le mur de Bob ni les messages Alice/Bob.
- Retirer l’amitié : le mur devient inaccessible et les nouveaux messages sont refusés. Les anciens messages restent visibles à leurs participants.
- Tester la réinitialisation par e-mail puis la déconnexion.

## Vérifications et pipeline

```sh
npm test
npm run build
npm run preview
```

GitHub Actions exécute les tests puis le build à chaque push et pull request. Les tests exécutent réellement la migration et les politiques dans PostgreSQL via PGlite avec trois identités distinctes. Ils ne remplacent pas la recette Supabase Auth/SMTP et Vercel sur le projet déployé.

## Permissions

| Données | Lecture | Écriture |
| --- | --- | --- |
| Profil | Tous les membres authentifiés | Son propriétaire |
| Amitié acceptée | Tous les membres authentifiés | Demande par l’expéditeur, acceptation par le destinataire, suppression par l’un des deux |
| Demande en attente | Les deux personnes concernées | Identités immuables |
| Mur | Propriétaire du mur et ses amis | Auteur authentifié autorisé ; suppression par l’auteur ou propriétaire du mur |
| Message privé | Expéditeur et destinataire uniquement | Expéditeur, si l’amitié est acceptée |
| Poke | Les deux personnes concernées | Expéditeur ami ; suppression par destinataire |

Les e-mails et mots de passe sont gérés par Supabase Auth, jamais dans `profiles`. Les textes utilisateurs sont échappés avant affichage. Les IDs des participants et les horodatages ne peuvent pas être modifiés par les clients. Les photos externes et SVG sont refusées.

## Exploitation et périmètre

C’est une reconstitution fonctionnelle des usages principaux, pas l’intégralité du produit Facebook 2006. Les groupes, albums multi-photos, tags, fil d’actualité, pièces jointes, blocage/signalement et outils de modération ne sont pas implémentés. Les listes sont bornées (annuaire : 60, mur : 50, messages : 100) ; il n’y a pas encore de pagination pour les archives. Actualiser ou rouvrir la page charge les nouveautés ; aucune notification push ou abonnement temps réel.

Pour supprimer un compte, l’exploitant supprime l’utilisateur dans Supabase Authentication ; la suppression cascade vers son profil, ses relations et ses contenus. Les messages auxquels cet utilisateur participe sont aussi supprimés. L’interface de confidentialité oriente vers l’exploitant ; adaptez son contact avant une ouverture au-delà de votre cercle d’amis. Configurer les sauvegardes et la rétention depuis Supabase selon le plan choisi. Ne jamais copier les données de production dans l’aperçu.

## Références

- Interface historique : https://time.com/11740/facebook-10-year-anniversary-interfaces/ (captures 2005 et 2006 fournies par Facebook).
- Auth : https://supabase.com/docs/reference/javascript/auth-signup
- RLS : https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel : https://vite.dev/guide/static-deploy.html#vercel

Le design s’inspire des captures : il ne s’agit pas d’une copie certifiée pixel pour pixel et les portraits de personnes réelles ne sont pas repris.
