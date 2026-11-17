/** A single series drawn as a thin line ending on a dot. Decorative: the figure above it carries the value. */
export function Sparkline({ values, className }: { values: Array<number>; className?: string }) {
    const width = 200
    const height = 36
    if (values.length < 2) return <div className={className} style={{ height }} aria-hidden="true" />
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const span = max - min || 1
    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * (width - 4) + 2
        const y = height - 3 - ((value - min) / span) * (height - 6)
        return [x, y] as const
    })
    const [lastX, lastY] = points[points.length - 1]
    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={className}
            style={{ height, width: "100%" }}
            aria-hidden="true"
        >
            <polyline
                points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            <circle cx={lastX} cy={lastY} r="2.5" fill="currentColor" />
        </svg>
    )
}
