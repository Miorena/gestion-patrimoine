// Contenu du JWT signé à la connexion
export interface JwtPayload {
  sub: number; // identifiant de l'utilisateur
  email: string;
  role: string;
}
