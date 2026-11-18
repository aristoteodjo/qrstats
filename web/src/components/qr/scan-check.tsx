import { useQuery } from "@tanstack/react-query"
import { AlertTriangleIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"

import { renderQrSvg } from "@/components/qr/qr-image"
import { checkSvg, designContrast, verdict } from "@/lib/scan-check"
import type { Design } from "@/lib/qr"
import { cn } from "@/lib/utils"

const ICONS = { good: CheckCircle2Icon, fragile: AlertTriangleIcon, unreadable: XCircleIcon, mismatch: XCircleIcon }
const TONES = {
    good: "bg-positive-soft text-positive",
    fragile: "bg-warning-soft text-warning",
    unreadable: "bg-destructive/10 text-destructive",
    mismatch: "bg-destructive/10 text-destructive",
}

/** Decodes the code exactly as it will be downloaded, and says whether a phone will read it. */
export function ScanCheck({ design, data, className }: { design: Design; data: string; className?: string }) {
    const check = useQuery({
        queryKey: ["scan-check", data, design],
        queryFn: async () => verdict(await checkSvg(await renderQrSvg(design, data)), data, designContrast(design)),
        enabled: data.length > 0,
        staleTime: Infinity,
        gcTime: 60_000,
        placeholderData: (previous) => previous,
    })
    if (!data) return null
    const result = check.data
    const Icon = result ? ICONS[result.level] : Loader2Icon
    return (
        <p
            role="status"
            className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                result ? TONES[result.level] : "bg-muted text-muted-foreground",
                className,
            )}
        >
            <Icon className={cn("mt-0.5 size-4 shrink-0", !result && "animate-spin")} aria-hidden="true" />
            <span>
                {check.isError
                    ? "Vérification indisponible."
                    : result
                      ? result.message
                      : "Vérification de la lisibilité…"}
            </span>
        </p>
    )
}
