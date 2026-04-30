import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  useAuth as useClerkAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/react-router";

export type AuthRole = "owner" | "member" | null;

export interface OrgSummary {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
}

interface SetActiveArgs {
  organizationId: string | null;
}

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null | undefined;
  userEmail: string | null | undefined;
  userName: string | null | undefined;
  userImageUrl: string | null | undefined;
  organizationId: string | null | undefined;
  organizationName: string | null | undefined;
  organizationSlug: string | null | undefined;
  role: AuthRole;
  organizations: OrgSummary[];
  setActiveOrganization: (args: SetActiveArgs) => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isLoaded: clerkLoaded,
    isSignedIn,
    getToken,
  } = useClerkAuth();
  const { user } = useUser();
  const { organization, isLoaded: orgLoaded, membership } = useOrganization();
  const {
    setActive,
    userMemberships,
    isLoaded: listLoaded,
  } = useOrganizationList({ userMemberships: { infinite: true } });

  useEffect(() => {
    if (
      listLoaded &&
      isSignedIn &&
      !organization &&
      userMemberships.data &&
      userMemberships.data.length > 0 &&
      setActive
    ) {
      const firstOrg = userMemberships.data[0].organization;
      setActive({ organization: firstOrg.id });
    }
  }, [listLoaded, isSignedIn, organization, userMemberships.data, setActive]);

  const role: AuthRole = membership
    ? membership.role === "org:admin"
      ? "owner"
      : "member"
    : null;

  const organizations: OrgSummary[] = useMemo(() => {
    if (!userMemberships.data) return [];
    return userMemberships.data.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug ?? null,
      imageUrl: m.organization.imageUrl ?? null,
    }));
  }, [userMemberships.data]);

  const setActiveOrganization = useCallback(
    async ({ organizationId }: SetActiveArgs) => {
      if (!setActive) return;
      await setActive({ organization: organizationId });
    },
    [setActive],
  );

  const authFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const token = await getToken({ skipCache: true });
      const url = path.startsWith("/api") ? path : `/api${path}`;
      const isFormData = init?.body instanceof FormData;

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": organization?.id || "",
        ...init?.headers,
      };
      if (!isFormData) {
        (headers as Record<string, string>)["Content-Type"] = "application/json";
      }

      return fetch(url, { ...init, headers });
    },
    [getToken, organization?.id],
  );

  const isLoaded = clerkLoaded && orgLoaded && listLoaded;

  const value: AuthContextType = {
    isLoaded,
    isSignedIn: !!isSignedIn,
    userId: user?.id,
    userEmail: user?.primaryEmailAddress?.emailAddress ?? null,
    userName: user?.fullName ?? null,
    userImageUrl: user?.imageUrl ?? null,
    organizationId: organization?.id,
    organizationName: organization?.name,
    organizationSlug: organization?.slug,
    role,
    organizations,
    setActiveOrganization,
    authFetch,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
