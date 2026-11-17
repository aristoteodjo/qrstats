import type { ReactNode } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"

/** The top bar of a panel: the page title or view tabs on the left, its main actions on the right. */
export function PageBar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
    return (
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-2 size-11 md:hidden" />
                {children}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 py-2">{actions}</div> : null}
        </div>
    )
}

/** Filters and search between the figures and the table. */
export function Toolbar({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 sm:px-6">{children}</div>
}

/** The padded body under the bars, for forms and sections. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={["grid min-w-0 content-start gap-6 p-4 sm:p-6", className].filter(Boolean).join(" ")}>
            {children}
        </div>
    )
}

/** One h1 per page: the bar's title. */
export function PageTitle({ children }: { children: ReactNode }) {
    return <h1 className="font-heading truncate text-xl font-semibold">{children}</h1>
}
