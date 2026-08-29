import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { BookOpen, ChevronsUpDown, Check } from "lucide-react"
import { IconSchool } from "@tabler/icons-react"

export function TeamSwitcher() {
  const { teacherProfile } = useAuth()
  const { isMobile } = useSidebar()

  const schoolName = teacherProfile?.school || "ClassBun Academy"
  const subjectName = teacherProfile?.subject || "Teacher Workspace"
  const schoolLogoUrl = teacherProfile?.schoolLogoUrl

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground cursor-pointer"
              />
            }
          >
            <div className="flex items-center justify-center shrink-0 size-9 sm:size-10 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto transition-all">
              {schoolLogoUrl ? (
                <img
                  src={schoolLogoUrl}
                  alt={schoolName}
                  className="size-8 sm:size-9 group-data-[collapsible=icon]:size-6.5 object-contain rounded-md transition-all"
                />
              ) : (
                <IconSchool
                  size={32}
                  stroke={2}
                  className="!size-8 sm:!size-9 group-data-[collapsible=icon]:!size-6 text-foreground transition-all shrink-0"
                />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-semibold">{schoolName}</span>
              <span className="truncate text-xs text-muted-foreground">{subjectName}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5">
                Current Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2.5 p-2 font-medium">
                <div className="flex size-7 items-center justify-center shrink-0">
                  {schoolLogoUrl ? (
                    <img
                      src={schoolLogoUrl}
                      alt={schoolName}
                      className="size-6 object-contain rounded-md"
                    />
                  ) : (
                    <IconSchool size={24} stroke={2} className="!size-5.5 text-foreground shrink-0" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{schoolName}</p>
                  <p className="truncate text-xs text-muted-foreground">{subjectName}</p>
                </div>
                <Check className="size-4 text-primary ml-auto" />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 p-2 text-xs text-muted-foreground">
                <BookOpen className="size-4" />
                <span>Standard Grading: {teacherProfile?.gradingScale?.type || "Percentage"}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
