import { Link } from "@tanstack/react-router"
import { BarChart3Icon, LifeBuoyIcon, LogOutIcon, PlusIcon, QrCodeIcon, UserIcon } from "lucide-react"

import { Initials } from "@/components/dash/initials"
import { BrandMark } from "@/components/layout/brand"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"

const NAV = [
    { title: "Analyses", icon: BarChart3Icon, to: "/analyses" },
    { title: "QR codes", icon: QrCodeIcon, to: "/qr-codes" },
    { title: "Compte", icon: UserIcon, to: "/compte" },
] as const

const NAV_ITEM =
    "h-11 rounded-lg text-[15px] data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-accent-foreground"

type Props = { user: { name: string; email: string }; onSignOut: () => void }

export function AppSidebar({ user, onSignOut }: Props) {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild tooltip="qrstats">
                            <Link to="/analyses">
                                <BrandMark />
                                <span className="font-heading text-xl font-bold tracking-tight">qrstats</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip="Créer un QR code"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground mb-4 h-11 rounded-lg font-semibold"
                                >
                                    <Link to="/qr-codes/nouveau">
                                        <PlusIcon />
                                        <span>Créer un QR code</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {NAV.map(({ title, icon: Icon, to }) => (
                                <SidebarMenuItem key={to}>
                                    <SidebarMenuButton asChild tooltip={title} className={NAV_ITEM}>
                                        <Link
                                            to={to}
                                            activeProps={{ "data-active": true }}
                                            activeOptions={{ exact: to !== "/qr-codes" }}
                                        >
                                            <Icon />
                                            <span>{title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu className="gap-1">
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Aide" className={NAV_ITEM}>
                            <Link to="/aide" activeProps={{ "data-active": true }}>
                                <LifeBuoyIcon />
                                <span>Aide</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Déconnexion" className="h-11 text-[15px]" onClick={onSignOut}>
                            <LogOutIcon />
                            <span>Déconnexion</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarSeparator className="my-1" />
                    <SidebarMenuItem>
                        <div className="flex min-h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:px-0">
                            <Initials name={user.name || user.email} />
                            <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-sm font-medium">{user.name}</span>
                                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                            </span>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
