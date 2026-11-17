import type { ReactNode } from "react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type AppModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: ReactNode
    /** While a mutation runs the modal cannot be dismissed, so its result is never lost. */
    pending?: boolean
    footer?: ReactNode
    children?: ReactNode
    size?: "sm" | "md" | "lg" | "xl"
}

const WIDTH = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-5xl" }

/** The house modal: every dialog in the app goes through it. */
export function AppModal({
    open,
    onOpenChange,
    title,
    description,
    pending = false,
    footer,
    children,
    size = "md",
}: AppModalProps) {
    return (
        <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
            <DialogContent
                className={WIDTH[size]}
                showCloseButton={!pending}
                onInteractOutside={(event) => pending && event.preventDefault()}
                onEscapeKeyDown={(event) => pending && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="font-heading">{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                {children}
                {footer ? <DialogFooter>{footer}</DialogFooter> : null}
            </DialogContent>
        </Dialog>
    )
}
