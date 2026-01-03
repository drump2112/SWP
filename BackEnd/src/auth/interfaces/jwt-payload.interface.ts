export interface JwtPayload {
  sub: number; // user id
  username: string;
  roleCode: string;
  storeId?: number;
}
