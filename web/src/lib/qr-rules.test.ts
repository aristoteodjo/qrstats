import { describe, expect, it } from "vitest"

import { emailProblem, forKind, phoneProblem, urlProblem } from "@/lib/qr-rules"

describe("content rules", () => {
    it("accepts bare domains and refuses other schemes", () => {
        expect(urlProblem("example.com")).toBeUndefined()
        expect(urlProblem("https://a.example/x?y=1")).toBeUndefined()
        expect(urlProblem("javascript:alert(1)")).toBeDefined()
        expect(urlProblem("ftp://example.com")).toBeDefined()
        expect(urlProblem("nodot")).toBeDefined()
        expect(urlProblem(" ")).toBeDefined()
    })

    it("checks e-mail and phone", () => {
        expect(emailProblem("a@b.co")).toBeUndefined()
        expect(emailProblem("a@b")).toBeDefined()
        expect(emailProblem("", false)).toBeUndefined()
        expect(phoneProblem("+229 97 00 00 00")).toBeUndefined()
        expect(phoneProblem("abc")).toBeDefined()
    })

    it("skips other kinds", () => {
        expect(forKind("text", "url", () => "boom")).toBeUndefined()
        expect(forKind("url", "url", () => "boom")).toBe("boom")
    })
})
