import crypto from "crypto";

const CODE_LENGTH = 8;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getPepper() {
  return process.env.TELEGRAM_BINDING_PEPPER || process.env.NEXTAUTH_SECRET || "";
}

export function normalizeBindingCode(code: string) {
  return code.trim().toUpperCase();
}

export function generateBindingCode(length: number = CODE_LENGTH) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    const index = crypto.randomInt(0, ALPHABET.length);
    result += ALPHABET[index];
  }
  return result;
}

export function hashBindingCode(code: string) {
  const pepper = getPepper();
  return crypto.createHash("sha256").update(code + pepper).digest("hex");
}
