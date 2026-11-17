import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

/** One collapsible card of the editor: icon, title, one-line purpose. */
export function EditorSection({
    value,
    icon: Icon,
    title,
    description,
    children,
}: {
    value: string
    icon: LucideIcon
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <AccordionItem value={value} className="bg-card rounded-xl border px-4 shadow-xs last:border-b sm:px-6">
            <AccordionTrigger className="min-h-11 items-center py-5 hover:no-underline">
                <span className="flex min-w-0 items-center gap-4">
                    <span className="bg-muted text-primary grid size-11 shrink-0 place-items-center rounded-lg">
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                        <span className="font-heading text-base font-semibold">{title}</span>
                        <span className="text-muted-foreground text-sm font-normal">{description}</span>
                    </span>
                </span>
            </AccordionTrigger>
            <AccordionContent className="grid gap-6 border-t pt-6 pb-6">{children}</AccordionContent>
        </AccordionItem>
    )
}
