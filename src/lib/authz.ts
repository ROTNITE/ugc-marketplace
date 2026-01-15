import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
  brandProfileId?: string | null;
  creatorProfileId?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(role: Role | Role[]): Promise<SessionUser> {
  const user = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function isRole(user: SessionUser | null | undefined, role: Role) {
  return Boolean(user && user.role === role);
}

export function hasRole(user: SessionUser | null | undefined, roles: Role[]) {
  return Boolean(user && roles.includes(user.role));
}

export function requireBrandProfileId(user: SessionUser | null | undefined): string {
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.role !== "BRAND") throw new Error("FORBIDDEN");
  if (!user.brandProfileId) throw new Error("BRAND_PROFILE_REQUIRED");
  return user.brandProfileId;
}

export function requireCreatorProfileId(user: SessionUser | null | undefined): string {
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.role !== "CREATOR") throw new Error("FORBIDDEN");
  if (!user.creatorProfileId) throw new Error("CREATOR_PROFILE_REQUIRED");
  return user.creatorProfileId;
}

export function getBrandIds(user: SessionUser | null | undefined): string[] {
  if (!user) return [];
  return Array.from(new Set([user.id, user.brandProfileId].filter(Boolean))) as string[];
}

export function getCreatorIds(user: SessionUser | null | undefined): string[] {
  if (!user) return [];
  return Array.from(new Set([user.id, user.creatorProfileId].filter(Boolean))) as string[];
}

export function isBrandOwner(user: SessionUser | null | undefined, brandId: string | null | undefined) {
  if (!user || !brandId) return false;
  return getBrandIds(user).includes(brandId);
}

export function isCreatorOwner(user: SessionUser | null | undefined, creatorId: string | null | undefined) {
  if (!user || !creatorId) return false;
  return getCreatorIds(user).includes(creatorId);
}
