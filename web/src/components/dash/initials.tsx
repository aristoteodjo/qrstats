export function initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return "?"
    const first = words[0].charAt(0)
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : words[0].charAt(1)
    return (first + last).toUpperCase()
}

/** Name initials in a small round tile; the name itself is always written next to it. */
export function Initials({ name }: { name: string }) {
    return (
        <span
            aria-hidden="true"
            className="bg-muted text-muted-foreground inline-grid size-7 shrink-0 place-items-center rounded-full font-mono text-[0.65rem] font-medium"
        >
            {initialsOf(name)}
        </span>
    )
}
