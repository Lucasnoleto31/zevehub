import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Home,
  LineChart,
  User,
  Shield,
  Wallet,
  TrendingUp,
  Bot,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  isAdmin: boolean;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    color: "text-blue-500",
  },
  {
    title: "Operações",
    url: "/operations",
    icon: LineChart,
    color: "text-green-500",
  },
  {
    title: "Robôs",
    url: "/robos",
    icon: Bot,
    color: "text-purple-500",
  },
  {
    title: "Comunidade",
    url: "/comunidade",
    icon: Users,
    color: "text-pink-500",
  },
  {
    title: "Finanças Pessoais",
    url: "/financas",
    icon: Wallet,
    color: "text-yellow-500",
  },
  {
    title: "Inteligência de Mercado",
    url: "/inteligencia-mercado",
    icon: TrendingUp,
    color: "text-cyan-500",
  },
  {
    title: "Perfil",
    url: "/profile",
    icon: User,
    color: "text-orange-500",
  },
];

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-60"} bg-black border-r border-white/10`}
      collapsible="icon"
    >
      <SidebarContent className="bg-black">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-white/10 text-white/80"
                      activeClassName="bg-white/20 text-white font-medium"
                    >
                      <item.icon className={`mr-2 h-4 w-4 ${item.color}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      end
                      className="hover:bg-white/10 text-white/80"
                      activeClassName="bg-white/20 text-white font-medium"
                    >
                      <Shield className="mr-2 h-4 w-4 text-red-500" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
