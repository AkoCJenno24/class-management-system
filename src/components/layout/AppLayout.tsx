import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';
import { CreateStudentDialog } from '@/components/students/CreateStudentDialog';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import { Search } from 'lucide-react';

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
  if (pathname === '/settings') {
    return [{ label: 'Settings', href: '/settings' }];
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
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <SidebarProvider>
      <AppSidebar onOpenCreateClass={() => setIsCreateClassOpen(true)} />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Top bar with collapse trigger, breadcrumbs, global search trigger, and theme toggle */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xs transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="hidden sm:block">
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

          <div className="flex items-center gap-2.5">
            {/* Global Search Trigger Bar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGlobalSearchOpen(true)}
              className="h-9 w-44 sm:w-60 md:w-72 justify-between text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border-border/80 rounded-lg px-2.5 shadow-2xs cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Search platform...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center justify-center rounded border border-border/80 bg-background/90 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs">
                  {isMac ? '⌘' : 'Ctrl'}
                </kbd>
                <kbd className="pointer-events-none inline-flex h-5 w-5 select-none items-center justify-center rounded border border-border/80 bg-background/90 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs">
                  K
                </kbd>
              </div>
            </Button>

            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>

      <GlobalSearchDialog
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        onOpenCreateClass={() => setIsCreateClassOpen(true)}
        onOpenCreateStudent={() => setIsCreateStudentOpen(true)}
      />

      <CreateClassDialog
        open={isCreateClassOpen}
        onOpenChange={setIsCreateClassOpen}
      />

      <CreateStudentDialog
        open={isCreateStudentOpen}
        onOpenChange={setIsCreateStudentOpen}
      />
    </SidebarProvider>
  );
}
