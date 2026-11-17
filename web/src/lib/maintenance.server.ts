import { timingSafeEqual } from "node:crypto"

/** Maintenance endpoints stay closed unless MAINTENANCE_SECRET is set and sent as a bearer token. */
export function maintenanceAuthorized(request: Request): boolean {
    const secret = process.env.MAINTENANCE_SECRET ?? ""
    if (!secret) return false
    const given = Buffer.from(request.headers.get("authorization") ?? "")
    const expected = Buffer.from(`Bearer ${secret}`)
    return given.length === expected.length && timingSafeEqual(given, expected)
}

export const unauthorized = () => Response.json({ error: { code: "unauthorized" } }, { status: 401 })
