import { HeadContent, Outlet, Scripts, createRootRouteWithContext, notFound, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import type { ReactNode } from "react"

import appCss from "@/styles.css?url"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { currentSpace } from "@/lib/current-space"
import type { Space } from "@/lib/spaces"

type RouterContext = { queryClient: QueryClient; space: Space | null }

export const Route = createRootRouteWithContext<RouterContext>()({
    beforeLoad: () => {
        const space = currentSpace()
        if (!space) throw notFound()
        return { space }
    },
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "qrstats, des QR codes modifiables et mesurés" },
            {
                name: "description",
                content: "Créez des QR codes dont vous changez la destination après impression, et mesurez chaque scan.",
            },
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        ],
    }),
    component: () => <Outlet />,
    errorComponent: RootError,
    shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
    return (
        <html lang="fr">
            <head>
                <HeadContent />
            </head>
            <body>
                <a
                    href="#contenu"
                    className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
                >
                    Aller au contenu
                </a>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster position="top-center" />
                <Scripts />
            </body>
        </html>
    )
}

/** Never shows technical details: the error is logged, the visitor gets a way out. */
function RootError({ error }: ErrorComponentProps) {
    const router = useRouter()
    useEffect(() => {
        console.error(error)
    }, [error])
    return (
        <main id="contenu" className="grid min-h-svh place-items-center p-6">
            <div className="grid max-w-sm gap-4 text-center">
                <h1 className="font-heading text-2xl font-semibold">Un problème est survenu</h1>
                <p className="text-muted-foreground text-sm">
                    La page n'a pas pu s'afficher. Réessayez ; si le problème continue, revenez dans quelques minutes.
                </p>
                <div className="flex justify-center gap-2">
                    <Button className="min-h-11" onClick={() => void router.invalidate()}>
                        Réessayer
                    </Button>
                    <Button variant="outline" className="min-h-11" asChild>
                        <a href="/">Accueil</a>
                    </Button>
                </div>
            </div>
        </main>
    )
}
