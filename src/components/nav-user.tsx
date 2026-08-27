import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { signOut } from "@/lib/firebase/auth"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
import {
  ChevronsUpDown,
  Sparkles,
  User,
  School,
  BookOpen,
  LogOut,
} from "lucide-react"
import { toast } from "sonner"
import { getInitials } from "@/lib/utils"
import { AVATAR_PRESETS } from "@/types"

export function NavUser() {
  const { teacherProfile } = useAuth()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Signed out successfully.")
      navigate("/login")
    } catch {
      toast.error("Failed to sign out. Please try again.")
    }
  }

  const name = teacherProfile
    ? `${teacherProfile.firstName} ${teacherProfile.lastName}`
    : "Teacher"
  const email = teacherProfile?.email || ""
  const initials = teacherProfile
    ? getInitials(teacherProfile.firstName, teacherProfile.lastName)
    : "T"

  const avatarPreset = teacherProfile?.avatarPreset
    ? AVATAR_PRESETS.find((p) => p.id === teacherProfile.avatarPreset)
    : null

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
            <Avatar className="h-8 w-8 rounded-lg">
              {avatarPreset && <AvatarImage src={avatarPreset.src} alt={name} />}
              <AvatarFallback
                className="rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: teacherProfile?.avatarColor || "#6366F1" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                  <Avatar className="h-9 w-9 rounded-lg">
                    {avatarPreset && <AvatarImage src={avatarPreset.src} alt={name} />}
                    <AvatarFallback
                      className="rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: teacherProfile?.avatarColor || "#6366F1" }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 text-xs text-muted-foreground">
                <Sparkles className="size-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Teacher Pro Account</span>
                  <span>Unlimited classes & students</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 text-xs">
                <School className="size-4 text-muted-foreground" />
                <span className="truncate">{teacherProfile?.school || "School: Not configured"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 text-xs">
                <BookOpen className="size-4 text-muted-foreground" />
                <span className="truncate">{teacherProfile?.subject || "Subject: General"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 text-xs">
                <User className="size-4 text-muted-foreground" />
                <span>Scale: {teacherProfile?.gradingScale?.type || "Standard"}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2.5 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
