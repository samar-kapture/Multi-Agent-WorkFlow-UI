import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col ml-[35px] bg-background">
          <header className="h-12 flex items-center border-b border-border bg-card/50 backdrop-blur">
            <SidebarTrigger className="ml-4" />
            <div className="ml-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Agent Builder Platform
              </h2>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
