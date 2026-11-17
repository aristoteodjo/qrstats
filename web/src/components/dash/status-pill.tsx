import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type Tone = "positive" | "warning" | "critical" | "info" | "neutral"

const TONES: Record<Tone, string> = {
    positive: "bg-positive-soft text-positive",
    warning: "bg-warning-soft text-warning",
    critical: "bg-destructive/10 text-destructive",
    info: "bg-accent text-accent-foreground",
    neutral: "bg-muted text-muted-foreground",
}

/** A state always written out; the tint only helps scanning a column. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>
            {children}
        </span>
    )
}
