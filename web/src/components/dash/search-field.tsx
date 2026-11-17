import { useId } from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

/** The borderless search of a list toolbar, on shadcn's Input. */
export function SearchField({
    value,
    onChange,
    label,
    placeholder = "Rechercher",
}: {
    value: string
    onChange: (value: string) => void
    label: string
    placeholder?: string
}) {
    const id = useId()
    return (
        <div className="text-muted-foreground focus-within:text-foreground relative flex min-h-11 min-w-0 flex-1 items-center">
            <SearchIcon className="pointer-events-none absolute left-0 size-4 shrink-0" aria-hidden="true" />
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Input
                id={id}
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="text-foreground h-11 min-w-0 flex-1 border-0 bg-transparent pl-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
        </div>
    )
}
