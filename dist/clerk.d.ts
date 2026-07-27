import type { UserResolver } from "./types";
interface ClerkEnv {
    CLERK_SECRET_KEY?: string;
    CLERK_PUBLISHABLE_KEY?: string;
    CLERK_JWT_KEY?: string;
}
export declare const clerkUserResolver: UserResolver<ClerkEnv>;
export {};
//# sourceMappingURL=clerk.d.ts.map