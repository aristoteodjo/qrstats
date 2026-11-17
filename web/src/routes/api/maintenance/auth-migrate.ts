import { createFileRoute } from "@tanstack/react-router"
import { getMigrations } from "better-auth/db/migration"

import { auth } from "@/lib/auth.server"
import { maintenanceAuthorized, unauthorized } from "@/lib/maintenance.server"

// Creates Better Auth's tables in the `better_auth` schema (created by the API migration). Closed without a secret.
export const Route = createFileRoute("/api/maintenance/auth-migrate")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                if (!maintenanceAuthorized(request)) return unauthorized()
                const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)
                await runMigrations()
                return Response.json({
                    created: toBeCreated.map((table) => table.table),
                    altered: toBeAdded.map((table) => table.table),
                })
            },
        },
    },
})
