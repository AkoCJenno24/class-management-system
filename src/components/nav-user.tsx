import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { signOut } from "@/lib/firebase/auth"
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
import { resolveAvatarSource } from "@/lib/utils"

export function NavUser() {
  const { teacherProfile } = useAuth()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)

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

  // Reset error state when avatar configuration changes
  useEffect(() => {
    setImageError(false)
  }, [teacherProfile?.avatarUrl, teacherProfile?.avatarPreset])

  const resolved = resolveAvatarSource({
    avatarUrl: teacherProfile?.avatarUrl,
    avatarPreset: teacherProfile?.avatarPreset,
    avatarColor: teacherProfile?.avatarColor,
    firstName: teacherProfile?.firstName || 'Teacher',
    lastName: teacherProfile?.lastName || '',
    id: teacherProfile?.uid,
  })

  const showImage = !imageError && (resolved.mode === 'photo' || resolved.mode === 'preset')

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
            <div className="relative h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-transparent select-none shadow-2xs ring-1 ring-border/40 isolate">
              {showImage && resolved.src ? (
                <img
                  src={resolved.src}
                  alt={name}
                  onError={() => setImageError(true)}
                  className="absolute inset-0 z-10 block h-full w-full object-cover"
                  style={{
                    backgroundColor: 'transparent',
                    opacity: 1,
                    filter: 'none',
                    mixBlendMode: 'normal',
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  style={{ backgroundColor: resolved.bgColor }}
                >
                  <span className="text-xs font-bold text-white leading-none">{resolved.initials}</span>
                </div>
              )}
            </div>
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
                  <div className="relative h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-transparent select-none shadow-2xs ring-1 ring-border/40 isolate">
                    {showImage && resolved.src ? (
                      <img
                        src={resolved.src}
                        alt={name}
                        onError={() => setImageError(true)}
                        className="absolute inset-0 z-10 block h-full w-full object-cover"
                        style={{
                          backgroundColor: 'transparent',
                          opacity: 1,
                          filter: 'none',
                          mixBlendMode: 'normal',
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center"
                        style={{ backgroundColor: resolved.bgColor }}
                      >
                        <span className="text-xs font-bold text-white leading-none">{resolved.initials}</span>
                      </div>
                    )}
                  </div>
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
