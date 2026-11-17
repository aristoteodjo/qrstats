import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** A band of headline figures, separated by hairlines rather than boxed in cards. */
export function KpiStrip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <dl
            aria-label={label}
            className={cn(
                "bg-muted/40 grid grid-cols-1 divide-y border-b sm:grid-cols-2 sm:divide-y-0 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x",
                className,
            )}
        >
            {children}
        </dl>
    )
}

type KpiProps = {
    label: string
    value: ReactNode
    /** Small figure set beside the value: a share, a unit, a qualifier ("94 %", "Normal"). */
    aside?: ReactNode
    /** A sparkline or a tick meter under the figure. */
    children?: ReactNode
    detail?: ReactNode
}

export function Kpi({ label, value, aside, children, detail }: KpiProps) {
    return (
        <div className="grid content-start gap-2 px-5 py-4 sm:px-6">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="flex min-w-0 flex-wrap items-start gap-x-1.5 gap-y-1">
                <span className="font-heading text-[1.75rem] leading-none font-medium tracking-tight tabular-nums">
                    {value}
                </span>
                {aside ? <span className="text-muted-foreground text-xs leading-none">{aside}</span> : null}
            </dd>
            {children ? <dd className="pt-1">{children}</dd> : null}
            {detail ? <dd className="text-muted-foreground text-xs">{detail}</dd> : null}
        </div>
    )
}
