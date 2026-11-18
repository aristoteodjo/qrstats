import type { ReactNode } from "react"

import { Brand } from "@/components/layout/brand"

/**
 * 404 and error pages share one picture: a QR code whose pattern is broken, the honest image of a link that leads
 * nowhere. Modules are fixed (not random) so the server and the browser draw the same thing.
 */
const BROKEN = [
    "1111111010001111111",
    "1000001001101000001",
    "1011101010001011101",
    "1011101000101011101",
    "1011101001001011101",
    "1000001010101000001",
    "1111111010101111111",
    "0000000001000000000",
    "1011011100010010110",
    "0100100000000100001",
    "1101001000000011010",
    "0000000001010110100",
    "1111111000000101011",
    "1000001010110010010",
    "1011101001000100110",
    "1011101011001010001",
    "1011101000110100100",
    "1000001010010001011",
    "1111111001101010000",
]

function BrokenCode({ code }: { code: string }) {
    return (
        <div className="relative mx-auto w-48 sm:w-56">
            <svg
                viewBox="-1 -1 21 21"
                className="text-foreground h-auto w-full"
                aria-hidden="true"
                shapeRendering="crispEdges"
            >
                {BROKEN.map((row, r) =>
                    row.split("").map((bit, c) => {
                        if (bit !== "1") return null
                        // A hole in the middle: these modules drift away, the code no longer reads.
                        const hole = r >= 7 && r <= 12 && c >= 6 && c <= 12
                        return (
                            <rect
                                key={`${r}-${c}`}
                                x={c + (hole ? ((r * 7 + c * 3) % 5) - 2 : 0) * 0.35}
                                y={r + (hole ? ((r * 3 + c * 5) % 5) - 2 : 0) * 0.35}
                                width="1"
                                height="1"
                                fill={hole && (r + c) % 4 === 0 ? "var(--primary)" : "currentColor"}
                                opacity={hole ? 0.35 : 1}
                            />
                        )
                    }),
                )}
            </svg>
            <span className="bg-background font-heading absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-3xl font-bold tracking-tight tabular-nums">
                {code}
            </span>
        </div>
    )
}

export function StatusPage({
    code,
    title,
    text,
    actions,
}: {
    code: string
    title: string
    text: string
    actions: ReactNode
}) {
    return (
        <div className="flex min-h-svh flex-col px-5 py-8 sm:px-10">
            <a href="/" className="w-fit" aria-label="qrstats, accueil">
                <Brand />
            </a>
            <main
                id="contenu"
                className="mx-auto grid max-w-md flex-1 content-center justify-items-center gap-8 py-12 text-center"
            >
                <BrokenCode code={code} />
                <div className="grid gap-3">
                    <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
                    <p className="text-muted-foreground">{text}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">{actions}</div>
            </main>
        </div>
    )
}
