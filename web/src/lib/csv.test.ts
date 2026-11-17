import { describe, expect, it } from "vitest"

import { toCsv } from "@/lib/csv"

describe("toCsv", () => {
    it("opens as columns in a French spreadsheet", () => {
        expect(toCsv(["Nom", "Loyer"], [["Fidjrossè", 120000]])).toBe("﻿Nom;Loyer\r\nFidjrossè;120000\r\n")
    })

    it("quotes what would break a cell", () => {
        expect(toCsv(["A"], [['Dit "Koffi"; aîné'], ["deux\nlignes"]])).toBe(
            '﻿A\r\n"Dit ""Koffi""; aîné"\r\n"deux\nlignes"\r\n',
        )
    })

    it("never lets a cell become a formula", () => {
        expect(toCsv(["A"], [["=HYPERLINK(1)"], ["-5"], [-5], [null]])).toBe(
            "﻿A\r\n'=HYPERLINK(1)\r\n'-5\r\n-5\r\n\r\n",
        )
    })
})
