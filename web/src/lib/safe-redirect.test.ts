import { describe, expect, it } from "vitest"

import { safeRedirect as redirect, sameOriginPath } from "@/lib/safe-redirect"

const ORIGIN = "https://charlomi-admin.vercel.app"

describe("sign-in redirect", () => {
    it.each(["/", "/baux", "/plateforme/organisations?q=a"])("keeps %s", (path) => {
        expect(redirect.parse(path)).toBe(path)
    })
    it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com"])("drops %s", (path) => {
        expect(redirect.parse(path)).toBeUndefined()
    })
})

describe("sameOriginPath", () => {
    it.each([
        ["/plateforme", "/plateforme"],
        ["/plateforme/parametres?x=1#a", "/plateforme/parametres?x=1#a"],
        [undefined, "/"],
    ])("keeps %s", (path, expected) => {
        expect(sameOriginPath(path, ORIGIN)).toBe(expected)
    })

    it.each(["//evil.com", "/\t/evil.com", "/\n/evil.com", "/\\evil.com", "https://evil.com/", "javascript:alert(1)"])(
        "refuses %j",
        (path) => {
            expect(sameOriginPath(path, ORIGIN)).toBe("/")
        },
    )
})
