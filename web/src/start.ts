import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start"

import { MAINTENANCE_HTML } from "@/lib/maintenance-page"

const csrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" })

// MAINTENANCE_MODE=true answers every page with a 503; /api/maintenance/* stays reachable to finish the work.
const maintenanceMiddleware = createMiddleware().server(({ request, next }) => {
    if (process.env.MAINTENANCE_MODE !== "true") return next()
    if (new URL(request.url).pathname.startsWith("/api/maintenance/")) return next()
    return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Retry-After": "3600",
            "X-Robots-Tag": "noindex",
            "Cache-Control": "no-store",
        },
    })
})

export const startInstance = createStart(() => ({ requestMiddleware: [maintenanceMiddleware, csrfMiddleware] }))
