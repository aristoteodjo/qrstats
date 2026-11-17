import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
    return <img src="/favicon.svg" alt="" className={cn("size-8", className)} />
}

export function Brand({ className }: { className?: string }) {
    return (
        <span className={cn("font-heading flex items-center gap-2 text-xl font-bold tracking-tight", className)}>
            <BrandMark />
            qrstats
        </span>
    )
}
