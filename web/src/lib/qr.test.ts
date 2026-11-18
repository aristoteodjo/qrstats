import { describe, expect, it } from "vitest"

import {
    actionHref,
    isGuestKind,
    qrPayload,
    readContent,
    readDesign,
    staticPayload,
    summary,
    vcardText,
    wifiPayload,
} from "@/lib/qr"

describe("payloads", () => {
    it("escapes Wi-Fi special characters", () => {
        expect(wifiPayload({ ssid: 'Café;"Bar"', password: "a:b,c", encryption: "WPA", hidden: true })).toBe(
            'WIFI:T:WPA;S:Café\\;\\"Bar\\";P:a\\:b\\,c;H:true;;',
        )
        expect(wifiPayload({ ssid: "Open", password: "ignored", encryption: "nopass", hidden: false })).toBe(
            "WIFI:T:nopass;S:Open;;",
        )
    })

    it("encodes the short link for every dynamic kind", () => {
        expect(qrPayload("url", { url: "https://a.example" }, "https://q.example/r/abc")).toBe(
            "https://q.example/r/abc",
        )
        expect(qrPayload("wifi", { ssid: "x", encryption: "nopass" }, "https://q.example/r/abc")).toBe(
            "WIFI:T:nopass;S:x;;",
        )
    })

    it("builds a vCard without empty fields", () => {
        const card = vcardText({
            first_name: "Awa",
            last_name: "Diallo",
            organization: "Atelier, SARL",
            title: "",
            phone: "+229 97 00 00 00",
            email: "awa@example.com",
            website: "",
            address: "",
            note: "",
        })
        expect(card).toContain("FN:Awa Diallo")
        expect(card).toContain("ORG:Atelier\\, SARL")
        expect(card).toContain("TEL;TYPE=CELL:+22997000000")
        expect(card).not.toContain("TITLE")
        expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true)
    })

    it("builds action links", () => {
        expect(actionHref("email", { to: "a@b.co", subject: "Bonjour à tous" })).toBe(
            "mailto:a@b.co?subject=Bonjour%20%C3%A0%20tous",
        )
        expect(actionHref("phone", { phone: "+229 97-00" })).toBe("tel:+2299700")
        expect(actionHref("sms", { phone: "+229", message: "Oui !" })).toBe("sms:+229?body=Oui%20!")
        expect(actionHref("url", { url: "x" })).toBeNull()
    })
})

describe("static payloads", () => {
    it("writes the content itself into the code", () => {
        expect(staticPayload("url", { url: "example.com/menu" })).toBe("https://example.com/menu")
        expect(staticPayload("url", { url: "http://a.example" })).toBe("http://a.example")
        expect(staticPayload("text", { text: "Bonjour" })).toBe("Bonjour")
        expect(staticPayload("phone", { phone: "+229 97 00" })).toBe("tel:+2299700")
        expect(staticPayload("email", { to: "a@b.co" })).toBe("mailto:a@b.co")
        expect(staticPayload("sms", { phone: "+229 97", message: "Oui" })).toBe("SMSTO:+22997:Oui")
        expect(staticPayload("wifi", { ssid: "x", encryption: "nopass" })).toBe("WIFI:T:nopass;S:x;;")
        expect(isGuestKind("vcard")).toBe(false)
        expect(isGuestKind("url")).toBe(true)
    })
})

describe("reading stored data", () => {
    it("falls back to empty content and default design", () => {
        expect(readContent("url", null).url).toBe("")
        expect(summary("vcard", { organization: "Atelier" })).toBe("Atelier")
        const design = readDesign({ dots: { style: "nope", color: "red" }, logo: { image: "javascript:x" } })
        expect(design.dots).toEqual({ style: "square", color: "#000000" })
        expect(design.logo.image).toBeNull()
        expect(design.frame.style).toBe("none")
    })
})
