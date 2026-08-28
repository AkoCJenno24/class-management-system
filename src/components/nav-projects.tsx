import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { onClassesChange } from "@/lib/firebase/firestore"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupAction,
} from "@/components/ui/sidebar"
import { BookMarked, Plus, ArrowRight } from "lucide-react"
import type { Class } from "@/types"

interface NavProjectsProps {
  onOpenCreateClass?: () => void
}

export function NavProjects({ onOpenCreateClass }: NavProjectsProps) {
  const { user } = useAuth()
  const location = useLocation()
  const [classes, setClasses] = useState<Class[]>([])

  useEffect(() => {
    if (!user) return
    const unsubscribe = onClassesChange(user.uid, setClasses)
    return () => unsubscribe()
  }, [user])

  const activeClasses = classes.filter((c) => c.status !== 'archived')

  if (activeClasses.length === 0) {
    return null
  }

  const topClasses = activeClasses.slice(0, 5)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase">
        Quick Workspaces
      </SidebarGroupLabel>
      {onOpenCreateClass && (
        <SidebarGroupAction
          title="Create Class"
          onClick={onOpenCreateClass}
          className="cursor-pointer"
        >
          <Plus className="size-4" />
          <span className="sr-only">Create Class</span>
        </SidebarGroupAction>
      )}
      <SidebarMenu>
        {topClasses.map((item) => {
          const isActive = location.pathname === `/classes/${item.id}`

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                render={<Link to={`/classes/${item.id}`} />}
                isActive={isActive}
                tooltip={item.name}
              >
                <BookMarked className="size-4 text-primary" />
                <span className="truncate">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        {activeClasses.length > 5 && (
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link to="/classes" />}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="size-3.5" />
              <span>View all {activeClasses.length} active classes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
