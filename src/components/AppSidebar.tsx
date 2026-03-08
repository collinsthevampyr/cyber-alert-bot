import { Shield, BarChart3, Sliders, BookOpen, UserCircle, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Configuration", url: "/configuration", icon: Sliders },
  { title: "Documentation", url: "/docs", icon: BookOpen },
  { title: "Account", url: "/settings", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              {!collapsed && <span className="font-semibold tracking-tight text-foreground">SecureWatch</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-secondary text-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
