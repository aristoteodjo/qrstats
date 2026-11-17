import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { Button } from "@/components/ui/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
    return <nav aria-label="Pages" data-slot="pagination" className={cn("flex", className)} {...props} />
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul data-slot="pagination-content" className={cn("flex flex-row items-center gap-1", className)} {...props} />
    )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
    return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
    isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
    React.ComponentProps<"button">

// Client-side pages have no address of their own: the shadcn anchors become buttons.
function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
    return (
        <button
            type="button"
            aria-current={isActive ? "page" : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            className={cn(
                buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
                "min-h-11 min-w-11 tabular-nums",
                className,
            )}
            {...props}
        />
    )
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Page précédente"
            size="default"
            className={cn("gap-1 px-2.5", className)}
            {...props}
        >
            <ChevronLeftIcon />
            <span className="hidden sm:block">Précédente</span>
        </PaginationLink>
    )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink aria-label="Page suivante" size="default" className={cn("gap-1 px-2.5", className)} {...props}>
            <span className="hidden sm:block">Suivante</span>
            <ChevronRightIcon />
        </PaginationLink>
    )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn("flex size-11 items-center justify-center", className)}
            {...props}
        >
            <MoreHorizontalIcon className="size-4" />
        </span>
    )
}

export {
    Pagination,
    PaginationContent,
    PaginationLink,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
}
