import { describe, expect, it } from "vitest"

import { authError, emailRule, newPasswordRule } from "@/lib/auth-forms"

describe("auth rules", () => {
    it("checks e-mail and new passwords", () => {
        expect(emailRule.safeParse(" a@b.co ").success).toBe(true)
        expect(emailRule.safeParse("nope").success).toBe(false)
        expect(newPasswordRule.safeParse("abcdefghij").success).toBe(false)
        expect(newPasswordRule.safeParse("abcdefghi1").success).toBe(true)
        expect(newPasswordRule.safeParse("short1").success).toBe(false)
    })

    it("translates Better Auth codes", () => {
        expect(authError("INVALID_EMAIL_OR_PASSWORD", "x")).toBe("E-mail ou mot de passe incorrect.")
        expect(authError("SOMETHING_ELSE", "repli")).toBe("repli")
    })
})
