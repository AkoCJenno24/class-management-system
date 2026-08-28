import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { LayoutDashboard, BookOpen, Users, Settings, Archive, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavMain() {
  const location = useLocation()
  const [isClassesOpen, setIsClassesOpen] = useState(false)

  const isClassesPath = location.pathname.startsWith("/classes")
  const isArchivedClasses = location.pathname === "/classes/archived"
  const isActiveClasses = isClassesPath && !isArchivedClasses

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase">
        Platform
      </SidebarGroupLabel>
      <SidebarMenu>
        {/* Dashboard */}
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to="/" />}
            isActive={location.pathname === "/"}
            tooltip="Dashboard"
            className="font-medium"
          >
            <LayoutDashboard className="size-4" />
            <span>Dashboard</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Classes with Expandable Sub-navigation */}
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to="/classes" />}
            isActive={isClassesPath}
            tooltip="Classes"
            className="font-medium cursor-pointer"
            onClick={() => {
              if (isClassesOpen) {
                setIsClassesOpen(false)
              }
            }}
          >
            <BookOpen className="size-4" />
            <span>Classes</span>
          </SidebarMenuButton>

          <SidebarMenuAction
            aria-label="Toggle classes sub-navigation"
            title={isClassesOpen ? "Collapse classes" : "Expand classes"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsClassesOpen((prev) => !prev);
            }}
            className="cursor-pointer"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-200",
                isClassesOpen && "rotate-90"
              )}
            />
          </SidebarMenuAction>

          {isClassesOpen && (
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={<Link to="/classes" />}
                  isActive={isActiveClasses}
                >
                  <BookOpen className="size-3.5" />
                  <span>Active Classes</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={<Link to="/classes/archived" />}
                  isActive={isArchivedClasses}
                >
                  <Archive className="size-3.5 text-amber-500/80" />
                  <span>Archived Classes</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>

        {/* Students */}
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to="/students" />}
            isActive={location.pathname.startsWith("/students")}
            tooltip="Students"
            className="font-medium"
          >
            <Users className="size-4" />
            <span>Students</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Settings */}
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to="/settings" />}
            isActive={location.pathname.startsWith("/settings")}
            tooltip="Settings"
            className="font-medium"
          >
            <Settings className="size-4" />
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
