import { describe, expect, it } from "vitest"

import { parseSpaceHosts, resolveSpace, spaceUrl } from "@/lib/spaces"

describe("resolveSpace", () => {
    it("maps the apex, www. and app.", () => {
        expect(resolveSpace("qrstats.app", "qrstats.app")).toEqual({ kind: "site" })
        expect(resolveSpace("www.qrstats.app", "qrstats.app")).toEqual({ kind: "site" })
        expect(resolveSpace("APP.qrstats.app:443", "qrstats.app")).toEqual({ kind: "app" })
        expect(resolveSpace("app.localhost:3110", "localhost")).toEqual({ kind: "app" })
    })

    it("refuses unknown hosts", () => {
        expect(resolveSpace("evil.com", "qrstats.app")).toBeNull()
        expect(resolveSpace("admin.qrstats.app", "qrstats.app")).toBeNull()
        expect(resolveSpace("a.b.qrstats.app", "qrstats.app")).toBeNull()
        expect(resolveSpace("toString.qrstats.app", "qrstats.app")).toBeNull()
        expect(resolveSpace(null, "qrstats.app")).toBeNull()
    })

    it("honours explicit space hosts", () => {
        const hosts = parseSpaceHosts("qrstats-app.vercel.app=app, bad=admin, =site")
        expect(hosts).toEqual({ "qrstats-app.vercel.app": "app" })
        expect(resolveSpace("qrstats-app.vercel.app", "qrstats.app", hosts)).toEqual({ kind: "app" })
        expect(spaceUrl("app", "qrstats.app", "https:", "", hosts)).toBe("https://qrstats-app.vercel.app")
    })

    it("builds space URLs", () => {
        expect(spaceUrl("app", "localhost", "http:", "3110")).toBe("http://app.localhost:3110")
        expect(spaceUrl("site", "qrstats.app", "https:", "")).toBe("https://qrstats.app")
    })
})
