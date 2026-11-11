// Content of the JWT signed at login
export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
}
