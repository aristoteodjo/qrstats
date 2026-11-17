import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** A row of visual choices behaving as one radio group (arrow keys move, one is checked). */
export function ChoiceGrid<T extends string>({
    label,
    value,
    options,
    onChange,
    size = "md",
}: {
    label: string
    value: T
    options: ReadonlyArray<{ value: T; label: string; render: ReactNode }>
    onChange: (value: T) => void
    size?: "sm" | "md"
}) {
    return (
        <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-medium">{label}</legend>
            <div className="flex flex-wrap gap-3">
                {options.map((option) => (
                    <label
                        key={option.value}
                        title={option.label}
                        className={cn(
                            "bg-card hover:border-primary/60 has-[:focus-visible]:ring-ring relative grid cursor-pointer place-items-center rounded-xl border-2 transition-colors has-[:focus-visible]:ring-2",
                            size === "sm" ? "size-14" : "size-20",
                            value === option.value ? "border-primary" : "border-border",
                        )}
                    >
                        <input
                            type="radio"
                            name={label}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        <span className="sr-only">{option.label}</span>
                        <span aria-hidden="true" className="grid place-items-center">
                            {option.render}
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    )
}
