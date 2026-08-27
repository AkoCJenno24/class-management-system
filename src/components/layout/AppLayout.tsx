/**
 * Main app layout wrapper.
 * Integrates shadcn sidebar-07 with SidebarProvider, AppSidebar, and SidebarInset header with dynamic Breadcrumb navigation.
 */
import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';

/** Maps route paths to breadcrumb items. */
function getBreadcrumbs(pathname: string) {
  if (pathname === '/') {
    return [{ label: 'Dashboard', href: '/' }];
  }
  if (pathname === '/classes') {
    return [{ label: 'Classes', href: '/classes' }];
  }
  if (pathname === '/students') {
    return [{ label: 'Students', href: '/students' }];
  }
  if (pathname.includes('/students/')) {
    return [
      { label: 'Classes', href: '/classes' },
      { label: 'Student Performance', href: pathname },
    ];
  }
  if (pathname.startsWith('/classes/')) {
    return [
      { label: 'Classes', href: '/classes' },
      { label: 'Class Workspace', href: pathname },
    ];
  }
  return [{ label: 'Dashboard', href: '/' }];
}

export function AppLayout() {
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar onOpenCreateClass={() => setIsCreateClassOpen(true)} />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Top bar with collapse trigger, breadcrumbs, and theme toggle */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-xs transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link to="/" />}>
                    Platform
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={crumb.href} className="inline-flex items-center gap-1.5">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-semibold text-foreground">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink render={<Link to={crumb.href} />}>
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>

      <CreateClassDialog
        open={isCreateClassOpen}
        onOpenChange={setIsCreateClassOpen}
      />
    </SidebarProvider>
  );
}
