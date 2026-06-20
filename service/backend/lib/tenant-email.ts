import { createClerkClient } from "@clerk/backend";
import type { Env } from "../types";

interface TenantIdentity {
  clerk_user_id?: string | null;
  clerk_org_id?: string | null;
}

export async function resolveTenantEmail(
  env: Env,
  tenant: TenantIdentity,
): Promise<string | null> {
  if (!env.CLERK_SECRET_KEY) return null;
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  try {
    if (tenant.clerk_user_id) {
      const user = await clerk.users.getUser(tenant.clerk_user_id);
      return user.emailAddresses?.[0]?.emailAddress ?? null;
    }
    if (tenant.clerk_org_id) {
      const memberships =
        await clerk.organizations.getOrganizationMembershipList({
          organizationId: tenant.clerk_org_id,
          limit: 20,
        });
      const admin =
        memberships.data.find((m) => m.role === "org:admin") ??
        memberships.data[0];
      return admin?.publicUserData?.identifier ?? null;
    }
  } catch (err) {
    console.warn("[ve-track][notify] tenant email resolve failed", err);
  }
  return null;
}
