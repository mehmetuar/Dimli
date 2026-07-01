// JWT payload'ının paylaşılan şekli. Kullanıcı token'ı `sub`+`username`+`role`,
// admin token'ı `sub`+`email`+`role`+`adminRole`, işletme sahibi token'ı ek `businessId`
// taşır — hepsi opsiyonel alanlarla tek tipte toplanır.
export interface JwtPayload {
  sub: string;
  username?: string;
  email?: string;
  role?: string;
  adminRole?: string;
  businessId?: string;
}
