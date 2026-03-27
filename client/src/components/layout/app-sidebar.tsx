import { Link, useLocation } from "wouter";
import { 
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, 
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Activity, LayoutDashboard, Users, UserRound, Pill, DoorOpen, LogOut, Stethoscope, Scissors, IndianRupee } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import logoImg from "@assets/Adobe_Express_-_file_1772173054491.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useAuth();
  const logoutMutation = useLogout();

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;
  const isDoctor = user?.role === 'DOCTOR';

  const menuItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true },
    { title: "Patients", url: "/patients", icon: Users, show: isManager || isDoctor },
    { title: "Doctors", url: "/doctors", icon: UserRound, show: isManager },
    { title: "Medicines", url: "/medicines", icon: Pill, show: isManager },
    { title: "Procedures", url: "/procedures", icon: Stethoscope, show: isManager },
    { title: "Surgeries", url: "/surgeries", icon: Scissors, show: isManager },
    { title: "Room Configuration", url: "/room-types", icon: DoorOpen, show: isAdmin },
    { title: "Charge Rates", url: "/charge-rates", icon: IndianRupee, show: isManager },
  ];

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Criticare Logo" className="w-10 h-10 object-contain" />
          <div className="font-display font-bold text-lg text-primary tracking-tight">
            Criticare IPD
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(item => item.show).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    className="font-medium rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-8">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => logoutMutation.mutate()}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sign Out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
