# Carnet de bord

## Authentification (JWT + rôles)
- Problème : sécuriser l'API et limiter les actions selon les 3 rôles.
- Options : sessions serveur, JWT dans un cookie, JWT en en-tête Bearer.
- Décision : JWT en en-tête Bearer, garde globale (tout est protégé sauf `@Public()`), garde de rôles via `@Roles()`.
- Raison : simple à tester et à expliquer ; le contrôle est centralisé, aucune route ne peut être oubliée.
- Capture : page de connexion + réponse 401/403 de l'API.

## Biens (création, modification, affichage)
- Problème : un bien = ligne commune + extension (équipement ou immobilier) selon la famille de la catégorie, avec code généré par la base.
- Options : une seule table large, ou héritage TypeORM, ou tables séparées (schéma v2).
- Décision : tables séparées ; création en une transaction (bien + extension + historique) ; règles RG04, état final, cohérence famille dans NestJS.
- Raison : une erreur annule tout (le compteur de code ne perd aucun numéro) ; les règles métier sont testables dans le service.
- Capture : formulaire (bloc équipement / immobilier), fiche détail avec historique.
