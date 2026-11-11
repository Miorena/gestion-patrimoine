# Gestion du patrimoine

Application web de gestion d'un parc de biens (équipements, mobilier, véhicules, immobilier) : inventaire,
suivi de l'état, validation de l'acquisition et historique de chaque modification.

- **API** : NestJS + TypeORM + PostgreSQL
- **Interface** : Angular
- **Exécution** : Docker (base, API et interface), utilisable depuis plusieurs appareils du réseau local

## Sommaire

1. [Fonctionnalités](#1-fonctionnalités)
2. [Architecture](#2-architecture)
3. [Démarrage avec Docker](#3-démarrage-avec-docker)
4. [Développement local](#4-développement-local)
5. [Configuration](#5-configuration)
6. [Base de données](#6-base-de-données)
7. [Rôles et droits](#7-rôles-et-droits)
8. [Règles de gestion](#8-règles-de-gestion)
9. [Routes de l'API](#9-routes-de-lapi)
10. [Choix techniques](#10-choix-techniques)
11. [Dépannage](#11-dépannage)
12. [Vocabulaire](#12-vocabulaire)
13. [Limites actuelles et suite prévue](#13-limites-actuelles-et-suite-prévue)

---

## 1. Fonctionnalités

**Biens**

- Liste paginée à gauche, détail à droite : un clic sur un bien affiche sa fiche, sans changer de page.
- Recherche par désignation ou code, filtres par catégorie et par état.
- Un bien = une ligne commune + des détails selon sa famille :
  - _équipement_ : marque, modèle, numéro de série ;
  - _immobilier_ : nature (bâtiment ou terrain), superficie, adresse, référence cadastrale.
- Gestion par lot (quantité) pour les équipements et le mobilier.
- Code d'inventaire généré automatiquement par la base : `PAT-AAAA-NNNNN` (ex. `PAT-2026-00012`).

**Fiche d'un bien**

- Onglet **Informations** : les champs sont groupés par sections (Identification, Acquisition, Équipement ou Immobilier, Observations).
- Onglet **Historique** : frise chronologique de toutes les actions (création, modification, validation), avec les valeurs avant → après.
- Bouton **Modifier** : les mêmes champs deviennent modifiables, avec **Enregistrer** et **Annuler**.
- Bouton **Nouveau** : formulaire vide. Annuler réaffiche la première ligne de la liste.
- Bouton **Valider l'acquisition** pour les rôles autorisés.

**Confort d'utilisation**

- Notifications (toasts) après chaque action : connexion, déconnexion, ajout, modification, validation.
- Confirmation avant la déconnexion.
- Mot de passe affichable à la connexion.
- L'écran tient dans la fenêtre : le nombre de biens par page s'adapte à la hauteur disponible.
- Affichage empilé (liste au-dessus du détail) sur les écrans de moins de 1000 px.

---

## 2. Architecture

```
Navigateur ──► nginx (interface Angular + proxy /api) ──► API NestJS ──► PostgreSQL
              port 8081                                    interne          127.0.0.1:5433
```

Avec Docker, un seul port est exposé au réseau : **8081**. L'interface appelle `/api` (même adresse que la page),
nginx relaie vers l'API : il n'y a donc pas de CORS à gérer et l'application fonctionne depuis n'importe quel appareil.

```
gestion-patrimoine/
├── api/                      API NestJS
│   ├── src/
│   │   ├── auth/             connexion, JWT, rôles
│   │   ├── assets/           biens : contrôleur, service, entités, DTO
│   │   ├── lookups/          catégories, états, localisations
│   │   ├── users/
│   │   ├── common/           gardes, décorateurs, énumérations
│   │   └── database/         migration, script SQL v2, seed
│   └── Dockerfile
├── web/                      Interface Angular
│   ├── src/app/
│   │   ├── core/             services, intercepteur, modèles, toasts
│   │   └── features/         login, assets (liste + panneau de détail)
│   ├── nginx.conf
│   └── Dockerfile
├── docs/carnet_de_bord.md    décisions techniques et leurs raisons
├── docker-compose.yml
└── README.md
```

---

## 3. Démarrage avec Docker

C'est la méthode recommandée pour **utiliser** l'application.

**Prérequis** : Docker (avec le plugin Compose) et Git.

```bash
git clone https://github.com/Miorena/gestion-patrimoine.git
cd gestion-patrimoine

# 1. Clé de signature des sessions : fichier .env à la racine (jamais commité)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 2. Volume qui conserve les données (une seule fois par machine)
docker volume create patrimoine-pg18

# 3. Construire et démarrer
docker compose up -d --build
docker compose ps          # les 3 services doivent être « Up », la base « healthy »

# 4. Créer le premier utilisateur (seulement si la base est vide)
docker compose exec -e SEED_EMAIL=admin@exemple.com -e SEED_PASSWORD=MotDePasse123 api node dist/database/seed.js
```

Les tables sont créées automatiquement au démarrage de l'API (la migration est ignorée si elle est déjà appliquée).
Ouvrir ensuite **http://localhost:8081**.

### Utiliser l'application depuis un autre appareil

1. Relever l'adresse de la machine : `hostname -I` (Linux) ou `ipconfig` (Windows).
2. Sur l'autre appareil, connecté au même réseau, ouvrir `http://ADRESSE:8081`.
3. Si la page ne s'ouvre pas, autoriser le port dans le pare-feu (`sudo ufw allow 8081/tcp` sous Linux).

La base de données n'écoute que sur la machine locale (`127.0.0.1:5433`) : elle n'est pas accessible depuis le réseau.
Il n'y a pas de HTTPS : cette configuration est prévue pour un réseau local de confiance.

### Commandes courantes

| Commande                       | Effet                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `docker compose up -d`         | Démarre l'application                                        |
| `docker compose stop`          | L'arrête (les conteneurs sont conservés)                     |
| `docker compose down`          | Supprime les conteneurs (les données restent dans le volume) |
| `docker compose up -d --build` | Reconstruit les images après une modification du code        |
| `docker compose logs -f api`   | Suit les messages de l'API                                   |

### Autres rôles

Pour créer un compte Gestionnaire ou Responsable, ajouter `-e SEED_ROLE=Gestionnaire` (ou `Responsable`) à la commande du seed,
avec un autre `SEED_EMAIL`. Le nom affiché peut être donné avec `-e SEED_NAME="Prénom Nom"`.

---

## 4. Développement local

Pour coder avec rechargement automatique, seule la base tourne dans Docker. Prérequis : **Node 22 ou plus récent**.

```bash
# Base de données seule
docker compose up -d db

# API : http://localhost:3000/api
cd api
npm install
cp .env.example .env       # puis régler DATABASE_URL (voir ci-dessous)
npm run migration:run      # crée les tables
SEED_EMAIL=admin@exemple.com SEED_PASSWORD=MotDePasse123 npm run seed   # premier utilisateur
npm run start:dev

# Interface : http://localhost:4200 (dans un autre terminal)
cd web
npm install
npm start
```

Avec la base du `docker-compose.yml`, `api/.env` contient :

```
DATABASE_URL=postgresql://patrimoine:patrimoine@localhost:5433/patrimoine
```

En développement, l'interface appelle `/api` et le serveur Angular relaie vers l'API grâce à `web/proxy.conf.json`.

Sous PowerShell, les variables du seed se définissent ainsi : `$env:SEED_EMAIL="..."; $env:SEED_PASSWORD="..."; npm run seed`.

Les deux modes ne se gênent pas : en Docker, l'API n'est pas publiée sur le port 3000.

---

## 5. Configuration

**Docker** : le fichier `.env` à la racine contient `JWT_SECRET`. Le reste est dans `docker-compose.yml`.

**Développement** : le fichier `api/.env` (jamais commité, modèle dans `api/.env.example`) :

| Variable                 | Rôle                                                                                                      | Exemple                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`           | Connexion PostgreSQL                                                                                      | `postgresql://patrimoine:patrimoine@localhost:5433/patrimoine` |
| `JWT_SECRET`             | Clé de signature des jetons : longue chaîne aléatoire (32 caractères minimum conseillés)                  | `openssl rand -hex 32`                                         |
| `JWT_EXPIRES_IN_SECONDS` | Durée d'une session                                                                                       | `28800` (8 heures)                                             |
| `FRONTEND_URL`           | Origine autorisée par CORS (utile seulement si l'interface est servie depuis une autre adresse que l'API) | `http://localhost:4200`                                        |
| `PORT`                   | Port de l'API                                                                                             | `3000`                                                         |

Pour une base hébergée sur Neon, l'URL se termine par `?sslmode=require` et doit être celle de la **connexion directe**
(pas le pooler). Les fichiers `.env` ne sont jamais envoyés sur GitHub.

---

## 6. Base de données

PostgreSQL 18 (même version que Neon). Le schéma est créé par la migration `InitSchema`, qui exécute `api/src/database/schema_v2.sql`.

| Table                                                    | Contenu                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `bien`                                                   | Les biens (code, désignation, valeur, date et mode d'acquisition, état, catégorie, localisation) |
| `bien_equipement`, `bien_immobilier`                     | Détails selon la famille du bien                                                                 |
| `categorie`, `etat`, `localisation`                      | Listes de référence                                                                              |
| `historique`                                             | Journal des actions sur les biens                                                                |
| `utilisateur`, `role`                                    | Comptes et rôles                                                                                 |
| `compteur_code`                                          | Compteur par année qui produit les codes `PAT-AAAA-NNNNN`                                        |
| `affectation`, `sortie`, `direction`, `service`, `agent` | Prévues pour la suite (non utilisées par l'interface)                                            |

**Catégories** : Mobilier, Informatique & Télécom, Véhicules, Équipements techniques, Immobilier, Autres (la famille _immobilier_ concerne seulement la catégorie Immobilier).
**États** : En stock, En service, En maintenance, et trois états finaux : Cédé, Réformé, Perdu.

### Consulter les données avec DBeaver

| Champ               | Valeur (base Docker)        |
| ------------------- | --------------------------- |
| Host                | `localhost`                 |
| Port                | `5433`                      |
| Database            | `patrimoine`                |
| Username / Password | `patrimoine` / `patrimoine` |

### Sauvegarder et restaurer

```bash
# Sauvegarde de la base locale
docker compose exec -T db pg_dump -U patrimoine --no-owner --no-acl patrimoine > sauvegarde.sql

# Restauration dans une base vide
docker compose exec -T db psql -U patrimoine -d patrimoine < sauvegarde.sql
```

Pour copier une base **Neon** vers la base locale, utiliser un client de version 18 (celle de Neon) :

```bash
export NEON_URL='postgresql://utilisateur:motdepasse@hote/base?sslmode=require'   # connexion directe
docker run --rm postgres:18 pg_dump --no-owner --no-acl "$NEON_URL" > neon-backup.sql
docker compose exec -T db psql -U patrimoine -d patrimoine < neon-backup.sql
```

La sauvegarde contient aussi les comptes (mots de passe hachés) : ne pas la commiter. Les fichiers `.sql` de sauvegarde se rangent hors du dépôt.

---

## 7. Rôles et droits

| Action                                   | Administrateur | Gestionnaire | Responsable |
| ---------------------------------------- | -------------- | ------------ | ----------- |
| Voir la liste, le détail et l'historique | oui            | oui          | oui         |
| Créer et modifier un bien                | oui            | oui          | non         |
| Valider l'acquisition (RG04)             | oui            | non          | oui         |

Les boutons de l'interface (Nouveau, Modifier, Valider l'acquisition) n'apparaissent que pour les rôles autorisés,
et l'API refuse de toute façon les actions non permises (erreur 403).

---

## 8. Règles de gestion

| Règle        | Comportement                                                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG04**     | Un bien ne peut passer « En service » qu'une fois son acquisition validée. L'état est grisé dans le formulaire tant que ce n'est pas fait.                                                          |
| Validation   | L'acquisition ne se valide qu'une fois (sinon erreur 409) et l'action est inscrite dans l'historique.                                                                                               |
| États finaux | Cédé, Réformé et Perdu ne peuvent pas être choisis dans le formulaire : ils sont réservés au processus de sortie (pas encore développé). Un bien déjà dans un état final ne peut plus être modifié. |
| Création     | Un nouveau bien ne peut pas être créé directement dans un état final.                                                                                                                               |
| Famille      | Un bien garde sa famille : à la modification, seules les catégories de la même famille sont proposées. Les détails fournis doivent correspondre à la famille (équipement ou immobilier).            |
| Lot          | Un bien immobilier n'est jamais géré par lot. Un bien hors lot a une quantité de 1.                                                                                                                 |
| Date         | La date d'acquisition ne peut pas être dans le futur.                                                                                                                                               |
| Localisation | La localisation, la catégorie et l'état doivent exister.                                                                                                                                            |
| Code         | Généré par la base à la création, jamais modifiable.                                                                                                                                                |
| Transaction  | Création et modification (bien + détails + historique) se font en une seule transaction : en cas d'erreur, rien n'est enregistré et aucun numéro de code n'est perdu.                               |

L'historique enregistre la **création**, chaque **modification** (champ par champ, avant → après)
et la **validation de l'acquisition**. Les détails d'équipement ou d'immobilier ne sont consignés que s'ils ont réellement changé.

---

## 9. Routes de l'API

Préfixe `/api`. Toutes les routes sont protégées par un jeton JWT (en-tête `Authorization: Bearer ...`), sauf la connexion.

| Méthode | Route                                          | Rôles                        | Rôle de la route                   |
| ------- | ---------------------------------------------- | ---------------------------- | ---------------------------------- |
| POST    | `/auth/login`                                  | public                       | Connexion (retourne le jeton)      |
| GET     | `/auth/me`                                     | tous                         | Utilisateur connecté               |
| GET     | `/lookups`                                     | tous                         | Catégories, états, localisations   |
| GET     | `/assets?page&limit&search&categoryId&stateId` | tous                         | Liste paginée (`limit` de 1 à 100) |
| GET     | `/assets/:id`                                  | tous                         | Détail d'un bien                   |
| GET     | `/assets/:id/history`                          | tous                         | Historique d'un bien               |
| POST    | `/assets`                                      | Administrateur, Gestionnaire | Créer un bien                      |
| PATCH   | `/assets/:id`                                  | Administrateur, Gestionnaire | Modifier un bien                   |
| POST    | `/assets/:id/validate-acquisition`             | Administrateur, Responsable  | Valider l'acquisition              |

Les données reçues sont validées strictement : les champs inconnus sont refusés.

---

## 10. Choix techniques

Les décisions importantes et leurs raisons sont dans `docs/carnet_de_bord.md`. En résumé :

- **Authentification** : JWT en en-tête Bearer, garde globale (tout est protégé sauf `@Public()`), contrôle des rôles par `@Roles()`.
- **Schéma** : tables séparées (bien, équipement, immobilier) plutôt qu'une table unique ; règles métier dans les services NestJS.
- **Performances** : la base peut être distante, donc chaque requête coûte un aller-retour réseau. La liste et l'historique lancent leurs requêtes en parallèle,
  le détail tient en une requête, et les listes de référence (catégories, états, localisations) sont gardées en mémoire 5 minutes côté API
  et côté interface. Les requêtes de plus de 300 ms sont signalées dans les logs de l'API.
- **Interface** : composants autonomes Angular, signaux pour l'état, un seul panneau pour la lecture, la modification et la création
  (mêmes champs, mêmes emplacements : rien ne bouge en passant en modification).
- **Docker** : l'API applique les migrations à chaque démarrage (sans effet si elles sont déjà faites) ; l'interface est compilée puis servie par nginx.

---

## 11. Dépannage

| Symptôme                                                                           | Cause et solution                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Configuration key "DATABASE_URL" does not exist`                                  | Le fichier `api/.env` manque (il n'est pas dans Git). `cp .env.example .env` puis le remplir.                                                                                                                                                    |
| `Cannot find module '.../dist/main'`                                               | Le fichier `api/tsconfig.build.tsbuildinfo` persiste alors que `dist/` a été vidé. Le supprimer, ou vérifier que `tsBuildInfoFile` pointe dans `dist/` (voir `api/tsconfig.json`).                                                               |
| `address already in use` sur le port 5432                                          | Un PostgreSQL local occupe déjà ce port. La base Docker utilise le port **5433** pour cette raison.                                                                                                                                              |
| `npm ci` échoue avec `ENOTFOUND registry.npmjs.org` pendant `docker compose build` | Certains réseaux (partage de connexion, pare-feu) ne laissent pas les conteneurs résoudre les noms. Essayer `network: host` dans la section `build` du service, ou une image `node:24-slim` au lieu de `node:24-alpine`.                         |
| `volume patrimoine-pg18 declared as external, but could not be found`              | Créer le volume : `docker volume create patrimoine-pg18`.                                                                                                                                                                                        |
| La page ne s'ouvre pas depuis un autre appareil                                    | Vérifier que les deux appareils sont sur le même réseau (pas un réseau « invités »), l'adresse utilisée, et le pare-feu (port 8081).                                                                                                             |
| L'API redémarre en boucle                                                          | `docker compose logs api` : en général `JWT_SECRET` ou la connexion à la base.                                                                                                                                                                   |
| Lenteurs avec une base Neon                                                        | La latence réseau multiplie chaque requête. Utiliser la base locale en développement, et héberger l'API dans la même région que Neon. Sur le plan gratuit, la base se met en veille après quelques minutes : la première requête est plus lente. |

---

## 12. Vocabulaire

La base est en français, le code en anglais.

| Base / métier | Code                        |
| ------------- | --------------------------- |
| bien          | `Asset`                     |
| catégorie     | `Category`                  |
| état          | `State`                     |
| localisation  | `Location`                  |
| historique    | `AssetHistory`              |
| équipement    | `AssetEquipment`            |
| immobilier    | `AssetRealEstate`           |
| lot           | `managedByLot` / `quantity` |

Messages de commit : `feat` (fonctionnalité), `fix` (correction), `perf`, `docs`, `chore`, avec le périmètre entre parenthèses (`feat(web): ...`).

---

## 13. Limites actuelles et suite prévue

- **Processus de sortie** : la table `sortie` existe, mais il n'y a pas encore d'écran ni de route pour céder, réformer ou déclarer un bien perdu. Les états finaux ne sont donc pas atteignables depuis l'interface.
- **Affectations** : les tables `affectation`, `direction`, `service` et `agent` sont prêtes, sans écran.
- **Localisations** : pas de gestion dans l'interface ; on les ajoute en SQL (`INSERT INTO localisation (nom, type, id_parent) ...`). Le cache de l'API reconnaît une nouvelle localisation immédiatement.
- **HTTPS** : non configuré (usage en réseau local).
- **Tests automatisés** : pas encore écrits.
