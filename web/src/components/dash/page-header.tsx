import type { ReactNode } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"

/** Page top: sidebar toggle on mobile, the one h1, its main actions. */
export function PageHeader({
    title,
    description,
    actions,
}: {
    title: ReactNode
    description?: ReactNode
    actions?: ReactNode
}) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-2 size-11 md:hidden" />
                <div className="grid min-w-0 gap-1">
                    <h1 className="font-heading truncate text-2xl font-semibold sm:text-3xl">{title}</h1>
                    {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
                </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    )
}

export function PageContent({ children }: { children: ReactNode }) {
    return <div className="grid min-w-0 content-start gap-6 p-4 sm:p-6 lg:px-10">{children}</div>
}
