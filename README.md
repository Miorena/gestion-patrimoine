# Gestion du patrimoine : API (NestJS) + Web (Angular)

## Démarrage (Windows, Node 22+)

### 1. API
```bash
cd api
npm install
copy .env.example .env      # puis renseigner DATABASE_URL (Neon, connexion directe) et JWT_SECRET
npm run migration:run       # exécute le script SQL v2 sur la base
set SEED_EMAIL=admin@exemple.com& set SEED_PASSWORD=MotDePasse123& npm run seed   # 1er utilisateur (Administrateur) + 1 localisation
npm run start:dev           # http://localhost:3000/api
```
Autres rôles : `SEED_ROLE=Gestionnaire` ou `SEED_ROLE=Responsable` (PowerShell : `$env:SEED_ROLE="Gestionnaire"`).

### 2. Web
```bash
cd web
npm install
npm start                   # http://localhost:4200
```
L'URL de l'API est dans `web/src/app/core/api-url.ts`.

## Droits (première version)
| Action | Administrateur | Gestionnaire | Responsable |
|---|---|---|---|
| Voir liste / détail / historique | oui | oui | oui |
| Créer / modifier un bien | oui | oui | non |
| Valider l'acquisition (RG04) | oui | non | oui |

## Routes API (préfixe `/api`)
`POST /auth/login` · `GET /auth/me` · `GET /lookups` · `GET /assets?page&limit&search&categoryId&stateId` ·
`GET /assets/:id` · `GET /assets/:id/history` · `POST /assets` · `PATCH /assets/:id` · `POST /assets/:id/validate-acquisition`

## Vocabulaire (base française → code anglais)
bien = Asset · catégorie = Category · état = State · localisation = Location · historique = AssetHistory ·
équipement = AssetEquipment · immobilier = AssetRealEstate · lot = managedByLot / quantity
