import type { UserResolver, VeTrackUser } from "./types.js";

interface ClerkEnv {
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_JWT_KEY?: string;
}

const EMPTY: VeTrackUser = { userId: null, orgId: null };

const headerOrgId = (req: Request): string | null =>
  req.headers.get("x-organization-id") ??
  req.headers.get("X-Organization-Id");

export const clerkUserResolver: UserResolver<ClerkEnv> = async (req, env) => {
  if (!env?.CLERK_SECRET_KEY && !env?.CLERK_JWT_KEY) return EMPTY;

  try {
    if (env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY) {
      const { createClerkClient } = await import("@clerk/backend");
      const clerk = createClerkClient({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
        jwtKey: env.CLERK_JWT_KEY,
      });
      const state = await clerk.authenticateRequest(req);
      const auth = state.toAuth();
      const userId =
        auth && typeof auth.userId === "string" ? auth.userId : null;
      if (!userId) return EMPTY;
      const orgId =
        auth && "orgId" in auth && typeof auth.orgId === "string"
          ? auth.orgId
          : null;
      return { userId, orgId: orgId ?? headerOrgId(req) };
    }

    const header =
      req.headers.get("authorization") ?? req.headers.get("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) return EMPTY;

    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      jwtKey: env.CLERK_JWT_KEY,
    });
    const userId = (payload.sub as string) || null;
    const tokenOrgId = (payload.org_id as string) || null;
    return { userId, orgId: tokenOrgId ?? headerOrgId(req) };
  } catch {
    return EMPTY;
  }
};
