import { ContactIcon, LinkIcon, MailIcon, MessageSquareIcon, PhoneIcon, TypeIcon, WifiIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { Kind } from "@/lib/qr"
import { cn } from "@/lib/utils"

export const KIND_ICONS: Record<Kind, LucideIcon> = {
    url: LinkIcon,
    text: TypeIcon,
    vcard: ContactIcon,
    wifi: WifiIcon,
    email: MailIcon,
    phone: PhoneIcon,
    sms: MessageSquareIcon,
}

export function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
    const Icon = KIND_ICONS[kind]
    return (
        <span
            aria-hidden="true"
            className={cn("bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-lg", className)}
        >
            <Icon className="size-5" />
        </span>
    )
}
