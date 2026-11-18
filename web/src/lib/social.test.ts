import { describe, expect, it } from "vitest"

import { buildSocialUrl } from "@/lib/social"

describe("social links", () => {
    it("builds profile links from handles", () => {
        expect(buildSocialUrl("instagram", { value: "@nectaras", message: "" })).toBe(
            "https://www.instagram.com/nectaras",
        )
        expect(buildSocialUrl("tiktok", { value: "nectaras", message: "" })).toBe("https://www.tiktok.com/@nectaras")
        expect(buildSocialUrl("youtube", { value: "@chaine/", message: "" })).toBe("https://www.youtube.com/@chaine")
        expect(buildSocialUrl("linkedin", { value: "aristote-odjo", message: "" })).toBe(
            "https://www.linkedin.com/in/aristote-odjo",
        )
    })

    it("builds a WhatsApp chat with a message", () => {
        expect(buildSocialUrl("whatsapp", { value: "+229 97 00-00", message: "Bonjour !" })).toBe(
            "https://wa.me/229970000?text=Bonjour%20!",
        )
        expect(buildSocialUrl("whatsapp", { value: "22997", message: " " })).toBe("https://wa.me/22997")
    })

    it("keeps pasted links and empty values", () => {
        expect(buildSocialUrl("facebook", { value: "https://facebook.com/x", message: "" })).toBe(
            "https://facebook.com/x",
        )
        expect(buildSocialUrl("google", { value: "", message: "" })).toBe("")
        expect(buildSocialUrl("google", { value: "ChIJ12", message: "" })).toBe(
            "https://search.google.com/local/writereview?placeid=ChIJ12",
        )
    })
})
