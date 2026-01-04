export interface JwtPayload {
  sub: number; // user id
  username: string;
  roleCode: string;
  storeId?: number;
  jti?: string; // JWT ID for refresh token revocation
}
