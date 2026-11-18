import { cn } from "@/lib/utils"

/**
 * The QR code's finder pattern, drawn large: the product's one visual motif. Decorative.
 * A fixed module layout (not random) so server and client render the same thing.
 */
const MODULES = ["1110111", "1000101", "1011101", "0001000", "1101011", "0100110", "1011101"]

export function FinderArt({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 29 29"
            className={cn("h-auto w-full", className)}
            aria-hidden="true"
            shapeRendering="crispEdges"
        >
            {[
                [0, 0],
                [22, 0],
                [0, 22],
            ].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <rect x={x} y={y} width="7" height="7" fill="currentColor" />
                    <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--hero)" />
                    <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--ultramarine)" />
                </g>
            ))}
            {MODULES.map((row, r) =>
                row
                    .split("")
                    .map((bit, c) =>
                        bit === "1" ? (
                            <rect
                                key={`${r}-${c}`}
                                x={11 + c}
                                y={11 + r}
                                width="1"
                                height="1"
                                fill="currentColor"
                                opacity={0.25 + ((r + c) % 3) * 0.25}
                            />
                        ) : null,
                    ),
            )}
            <rect x="22" y="22" width="3" height="3" fill="var(--ultramarine)" />
            <rect x="26" y="22" width="1" height="1" fill="currentColor" />
            <rect x="22" y="26" width="1" height="1" fill="currentColor" />
            <rect x="26" y="26" width="3" height="3" fill="currentColor" opacity="0.5" />
        </svg>
    )
}
