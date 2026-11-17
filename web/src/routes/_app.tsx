import { Outlet, createFileRoute, notFound } from "@tanstack/react-router"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SignInRedirect } from "@/components/shared/sign-in-redirect"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/hooks/use-session"

export const Route = createFileRoute("/_app")({
    // The session lives in the browser: rendering on the server would only flash an empty shell.
    ssr: false,
    beforeLoad: ({ context }) => {
        if (context.space.kind !== "app") throw notFound()
    },
    component: AppLayout,
})

function AppLayout() {
    const { user, pending, signOut } = useSession()
    if (pending) return <ShellSkeleton />
    if (!user) return <SignInRedirect />
    return (
        <SidebarProvider>
            <AppSidebar
                user={user}
                onSignOut={() => {
                    void signOut().then(() => window.location.assign("/connexion"))
                }}
            />
            <SidebarInset className="bg-background min-w-0">
                <main id="contenu" className="min-w-0 flex-1">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

function ShellSkeleton() {
    return (
        <div className="flex min-h-svh">
            <div className="bg-card hidden w-64 border-r p-4 md:grid md:content-start md:gap-3">
                {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-10" />
                ))}
            </div>
            <div className="grid flex-1 content-start gap-4 p-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40" />
            </div>
        </div>
    )
}
