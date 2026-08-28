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
        <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 sm:gap-3 border-b border-border bg-background/95 px-3 sm:px-4 md:px-6 backdrop-blur-xs transition-[width,height] ease-linear">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
            <SidebarTrigger className="-ml-1 h-8 w-8 sm:h-9 sm:w-9" />
            <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden xs:block" />
            <Breadcrumb className="hidden sm:block min-w-0">
              <BreadcrumbList className="flex-nowrap overflow-hidden text-ellipsis">
                <BreadcrumbItem className="hidden md:block shrink-0">
                  <BreadcrumbLink render={<Link to="/" />}>
                    Platform
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={crumb.href} className="inline-flex items-center gap-1.5 min-w-0">
                      {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
                      <BreadcrumbItem className="min-w-0">
                        {isLast ? (
                          <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[140px] md:max-w-[220px]">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink render={<Link to={crumb.href} />} className="truncate max-w-[100px] md:max-w-[180px]">
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

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Global Search Trigger Bar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGlobalSearchOpen(true)}
              className="h-8 sm:h-9 w-auto min-w-[36px] sm:w-56 md:w-72 justify-between text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border-border/80 rounded-lg px-2 sm:px-2.5 shadow-2xs cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="hidden xs:inline truncate text-[11px] sm:text-xs">Search platform...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-safe touch-scroll">
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
