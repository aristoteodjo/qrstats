/**
 * A CSV that Excel in French opens as columns: semicolons, a UTF-8 byte order mark, CRLF line ends.
 * A cell starting with = + - @ is prefixed with an apostrophe so a spreadsheet never runs it as a formula.
 */
const BOM = "\uFEFF"

export function toCsv(headers: Array<string>, rows: Array<Array<string | number | null | undefined>>): string {
    const cell = (value: string | number | null | undefined) => {
        let text = value === null || value === undefined ? "" : String(value)
        if (/^[=+\-@]/.test(text) && typeof value !== "number") text = `'${text}`
        return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    return `${BOM}${[headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`
}

export function downloadCsv(filename: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}
