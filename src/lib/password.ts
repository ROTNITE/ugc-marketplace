import bcrypt from "bcryptjs";

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, passwordHash: string) {
  return bcrypt.compare(plain, passwordHash);
}
