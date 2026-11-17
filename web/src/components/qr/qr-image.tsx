import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { designLogo } from "@/lib/logos"
import { framedSvg, stylingOptions, svgDataUrl } from "@/lib/qr-render"
import type { Design } from "@/lib/qr"
import { cn } from "@/lib/utils"

export const QR_SIZE = 600

/** Renders the styled, framed QR as an SVG document (client only: qr-code-styling draws with the DOM). */
export async function renderQrSvg(design: Design, data: string): Promise<string> {
    const { default: QRCodeStyling } = await import("qr-code-styling")
    const qr = new QRCodeStyling(stylingOptions(design, data, designLogo(design.logo), QR_SIZE))
    const raw = await qr.getRawData("svg")
    if (!raw) throw new Error("QR code impossible à générer.")
    const svg = raw instanceof Blob ? await raw.text() : raw.toString("utf8")
    return framedSvg(svg, design, QR_SIZE)
}

type Props = { design: Design; data: string; label: string; className?: string }

export function QrImage({ design, data, label, className }: Props) {
    const [svg, setSvg] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let current = true
        renderQrSvg(design, data)
            .then((result) => {
                if (!current) return
                setSvg(result)
                setFailed(false)
            })
            .catch(() => current && setFailed(true))
        return () => {
            current = false
        }
    }, [design, data])

    if (failed) {
        return (
            <p role="alert" className={cn("text-destructive grid place-items-center text-center text-sm", className)}>
                Ce contenu est trop long pour un QR code.
            </p>
        )
    }
    if (!svg) return <Skeleton className={cn("aspect-square", className)} />
    return <img src={svgDataUrl(svg)} alt={label} className={cn("h-auto", className)} />
}
