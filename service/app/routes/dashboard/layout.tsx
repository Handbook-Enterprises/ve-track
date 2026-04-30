import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
  OrganizationSwitcher,
} from "@clerk/react-router";
import { Outlet } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { ModeToggle } from "~/components/common/mode-toggle";
import DashboardSidebar from "~/components/common/dashboard-sidebar";
import { useAuthContext } from "~/context/AuthContext";
import { useTenantContext } from "~/context/TenantContext";
import { LoadingElement, ButtonElement } from "~/components/elements";

function TenantGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuthContext();
  const {
    tenant,
    loading: tenantLoading,
    error: tenantError,
    refresh,
  } = useTenantContext();

  if (!isLoaded || tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingElement size={28} className="text-[#FF4D00]" />
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-lg space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
            Couldn't load your tenant
          </h1>
          <p className="text-sm text-muted-foreground">{tenantError}</p>
          <p className="text-xs text-muted-foreground">
            Most often this means CLERK_SECRET_KEY in <code>service/.dev.vars</code>{" "}
            doesn't match the publishable key the frontend is using, or the dev
            server didn't reload after you edited the file. Check the wrangler
            terminal for the verifyToken error and restart{" "}
            <code>bun run dev</code>.
          </p>
          <ButtonElement variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </ButtonElement>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
            Provisioning your tenant…
          </h1>
          <p className="text-sm text-muted-foreground">
            One sec — we're spinning up your workspace on first sign-in.
          </p>
          <ButtonElement variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Reload
          </ButtonElement>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout() {
  return (
    <>
      <SignedIn>
        <TenantGuard>
          <SidebarProvider>
            <DashboardSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex flex-1 items-center justify-between">
                  <OrganizationSwitcher
                    appearance={{
                      elements: { rootBox: "flex items-center" },
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <ModeToggle />
                    <UserButton />
                  </div>
                </div>
              </header>
              <main className="flex-1 p-6">
                <Outlet />
              </main>
            </SidebarInset>
          </SidebarProvider>
        </TenantGuard>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
