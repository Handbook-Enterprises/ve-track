import type { UserResolver, VeTrackUser } from "./types";

interface ClerkEnv {
  CLERK_SECRET_KEY?: string;
}

const EMPTY: VeTrackUser = { userId: null, orgId: null };

export const clerkUserResolver: UserResolver<ClerkEnv> = async (req, env) => {
  if (!env?.CLERK_SECRET_KEY) return EMPTY;

  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return EMPTY;

  try {
    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    const userId = (payload.sub as string) || null;
    const tokenOrgId = (payload.org_id as string) || null;
    const headerOrgId =
      req.headers.get("x-organization-id") ??
      req.headers.get("X-Organization-Id");
    return { userId, orgId: tokenOrgId ?? headerOrgId ?? null };
  } catch {
    return EMPTY;
  }
};
