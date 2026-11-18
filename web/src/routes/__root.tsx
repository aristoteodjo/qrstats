import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import type { ReactNode } from "react"

import appCss from "@/styles.css?url"
import { StatusPage } from "@/components/shared/status-page"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "qrstats, des QR codes modifiables et mesurés" },
            {
                name: "description",
                content:
                    "Créez des QR codes dont vous changez la destination après impression, et mesurez chaque scan.",
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
        <>
            <title>Un problème est survenu | qrstats</title>
            <meta name="robots" content="noindex" />
            <StatusPage
                code="500"
                title="Un problème est survenu"
                text="La page n'a pas pu s'afficher. Vos QR codes imprimés continuent de fonctionner. Réessayez ; si le problème continue, revenez dans quelques minutes."
                actions={
                    <>
                        <Button size="lg" className="h-12 px-6" onClick={() => void router.invalidate()}>
                            Réessayer
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 px-6">
                            <a href="/">Accueil</a>
                        </Button>
                    </>
                }
            />
        </>
    )
}
