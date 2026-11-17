import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const HEX = /^#[0-9a-fA-F]{6}$/

/** A hex colour typed or picked; the typed text only applies once it is a full #RRGGBB. */
export function ColorField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}) {
    const id = useId()
    const [draft, setDraft] = useState<string | null>(null)
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    value={draft ?? value.toUpperCase()}
                    disabled={disabled}
                    maxLength={7}
                    spellCheck={false}
                    className="h-11 pr-14 font-mono"
                    onChange={(event) => {
                        const next = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`
                        setDraft(next)
                        if (HEX.test(next)) onChange(next.toLowerCase())
                    }}
                    onBlur={() => setDraft(null)}
                />
                <input
                    type="color"
                    aria-label={`${label} : nuancier`}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => {
                        setDraft(null)
                        onChange(event.target.value)
                    }}
                    className="absolute top-1/2 right-2 size-8 -translate-y-1/2 cursor-pointer rounded-md border bg-transparent p-0 disabled:opacity-50 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0.5"
                />
            </div>
        </div>
    )
}
