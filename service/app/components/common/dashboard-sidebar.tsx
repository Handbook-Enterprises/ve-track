import { Link, useLocation } from "react-router";
import { Activity, KeyRound, LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import Logo from "~/components/common/logo";
import { useTenantContext } from "~/context/TenantContext";

const NAV = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "API Keys", url: "/dashboard/keys", icon: KeyRound },
  { title: "Usage", url: "/dashboard/usage", icon: Activity },
];

export default function DashboardSidebar() {
  const location = useLocation();
  const { tenant } = useTenantContext();

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tenant</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="space-y-1 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Active tenant
          </p>
          <p className="truncate text-xs font-medium">
            {tenant?.name ?? "Provisioning…"}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Plan · {tenant?.plan ?? "—"}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
