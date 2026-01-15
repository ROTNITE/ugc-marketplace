import "next-auth";
import "next-auth/jwt";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    brandProfileId?: string | null;
    creatorProfileId?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  interface Session {
    user?: {
      id: string;
      role: Role;
      brandProfileId?: string | null;
      creatorProfileId?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    brandProfileId?: string | null;
    creatorProfileId?: string | null;
  }
}
