import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { routeTree } from "./routeTree.gen"
import { NotFoundPage } from "@/components/shared/not-found"
import { createQueryClient } from "@/integrations/query"

export function getRouter() {
    const queryClient = createQueryClient()
    const router = createTanStackRouter({
        routeTree,
        context: { queryClient, space: null },
        scrollRestoration: true,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
        defaultNotFoundComponent: NotFoundPage,
    })
    setupRouterSsrQueryIntegration({ router, queryClient })
    return router
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>
    }
}
