import { NavLink, useLocation } from "react-router-dom";
import { Bot, Book, Folder, SendHorizonal } from "lucide-react";
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
import { SidebarChat } from "./SidebarChat";

const navigationItems = [
  {
    title: "Bot Library",
    url: "/",
    icon: Book,
    description: "Browse and manage your created bots"
  },
  {
    title: "Flow Library",
    url: "/flows",
    icon: Folder,
    description: "Browse and manage your created flows"
  },
  // {
  //   title: "Create Bot",
  //   url: "/create",
  //   icon: Bot,
  //   description: "Build new intelligent agents"
  // },
  {
    title: "Agent Chat",
    url: "/chat",
    icon: SendHorizonal,
    description: "Chat with your agent via websocket"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-white" : "hover:bg-muted";

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup className="px-4 pt-6 pb-2">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 py-2 mb-4 tracking-wide uppercase">
            {!isCollapsed ? "Navigation" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full p-0">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center px-0 py-5 min-h-[56px] rounded-lg transition-all duration-200 text-base ${getNavCls({ isActive })}`
                      }
                    >
                      <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`} style={isCollapsed ? { justifyContent: 'center' } : {}}>
                        <item.icon className="w-6 h-6 shrink-0" />
                        {!isCollapsed && (
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-base font-semibold truncate">{item.title}</div>
                            <div className="text-xs text-muted-foreground opacity-80 truncate mt-0.5">{item.description}</div>
                          </div>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Company Branding */}
        <div className="mt-auto px-6 py-5 border-t border-border">
          <div className={`flex items-center justify-center gap-3 ${isCollapsed ? '' : ''}`}>
            <img src="/logo.png" alt="Kapture CX Logo" className="w-9 h-9 object-contain" />
            {!isCollapsed && (
              <span className="text-sm font-bold text-primary tracking-wide">Kapture CX</span>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}