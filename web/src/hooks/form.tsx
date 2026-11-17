import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import type { ComponentProps, ReactNode } from "react"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

type ErrorLike = string | { message?: string } | undefined | null

function asMessages(errors: Array<ErrorLike>) {
    return errors.filter(Boolean).map((error) => (typeof error === "string" ? { message: error } : error!))
}

type TextFieldProps = { label: string; description?: ReactNode } & Omit<
    ComponentProps<typeof Input>,
    "value" | "onChange" | "onBlur" | "name" | "id"
>

function TextField({ label, description, ...input }: TextFieldProps) {
    const field = useFieldContext<string>()
    const errors = field.state.meta.isTouched ? asMessages(field.state.meta.errors as Array<ErrorLike>) : []
    return (
        <Field data-invalid={errors.length > 0 || undefined}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={errors.length > 0 || undefined}
                {...input}
            />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errors} />
        </Field>
    )
}

type SelectFieldProps = {
    label: string
    description?: ReactNode
    placeholder?: string
    options: Array<{ value: string; label: string }>
    empty?: ReactNode
}

function SelectField({ label, description, placeholder, options, empty }: SelectFieldProps) {
    const field = useFieldContext<string>()
    const errors = field.state.meta.isTouched ? asMessages(field.state.meta.errors as Array<ErrorLike>) : []
    return (
        <Field data-invalid={errors.length > 0 || undefined}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                    field.handleChange(value)
                    field.handleBlur()
                }}
                disabled={options.length === 0}
            >
                <SelectTrigger id={field.name} className="w-full" aria-invalid={errors.length > 0 || undefined}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {options.length === 0 && empty ? <FieldDescription>{empty}</FieldDescription> : null}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errors} />
        </Field>
    )
}

type TextareaFieldProps = { label: string; description?: ReactNode } & Omit<
    ComponentProps<typeof Textarea>,
    "value" | "onChange" | "onBlur" | "name" | "id"
>

function TextareaField({ label, description, ...textarea }: TextareaFieldProps) {
    const field = useFieldContext<string>()
    const errors = field.state.meta.isTouched ? asMessages(field.state.meta.errors as Array<ErrorLike>) : []
    return (
        <Field data-invalid={errors.length > 0 || undefined}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={errors.length > 0 || undefined}
                {...textarea}
            />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errors} />
        </Field>
    )
}

/** A yes/no field: the label sits beside the box and the whole row is a 44 px target. */
function CheckboxField({
    label,
    description,
    disabled,
}: {
    label: string
    description?: ReactNode
    disabled?: boolean
}) {
    const field = useFieldContext<boolean>()
    const errors = field.state.meta.isTouched ? asMessages(field.state.meta.errors as Array<ErrorLike>) : []
    return (
        <Field data-invalid={errors.length > 0 || undefined}>
            <div className="flex min-h-11 items-center gap-3">
                <Checkbox
                    id={field.name}
                    name={field.name}
                    className="size-5"
                    checked={field.state.value}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                        field.handleChange(checked === true)
                        field.handleBlur()
                    }}
                    aria-invalid={errors.length > 0 || undefined}
                />
                <FieldLabel htmlFor={field.name} className="cursor-pointer">
                    {label}
                </FieldLabel>
            </div>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errors} />
        </Field>
    )
}

type RadioGroupFieldProps = {
    label: string
    description?: ReactNode
    options: Array<{ value: string; label: string }>
    orientation?: "horizontal" | "vertical"
}

/** One choice among a few, all visible: the group is named by its label (aria-labelledby). */
function RadioGroupField({ label, description, options, orientation = "vertical" }: RadioGroupFieldProps) {
    const field = useFieldContext<string>()
    const errors = field.state.meta.isTouched ? asMessages(field.state.meta.errors as Array<ErrorLike>) : []
    const labelId = `${field.name}-label`
    return (
        <Field data-invalid={errors.length > 0 || undefined}>
            <span id={labelId} className="text-sm font-medium">
                {label}
            </span>
            <RadioGroup
                aria-labelledby={labelId}
                value={field.state.value}
                onValueChange={(value) => {
                    field.handleChange(value)
                    field.handleBlur()
                }}
                className={orientation === "horizontal" ? "flex flex-wrap gap-2" : "grid gap-1"}
            >
                {options.map((option) => {
                    const id = `${field.name}-${option.value}`
                    return (
                        <Label
                            key={option.value}
                            htmlFor={id}
                            className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 font-normal"
                        >
                            <RadioGroupItem id={id} value={option.value} />
                            {option.label}
                        </Label>
                    )
                })}
            </RadioGroup>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errors} />
        </Field>
    )
}

type SubmitButtonProps = { pending: boolean; pendingLabel?: string } & Omit<ComponentProps<typeof Button>, "type">

/** `pending` comes from the mutation's isPending, never from local state. */
function SubmitButton({ pending, pendingLabel, children, disabled, ...props }: SubmitButtonProps) {
    const form = useFormContext()
    return (
        <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
                <Button type="submit" disabled={disabled || pending || !canSubmit} {...props}>
                    {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
                    {pending && pendingLabel ? pendingLabel : children}
                </Button>
            )}
        </form.Subscribe>
    )
}

export const { useAppForm, withForm } = createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
        TextField,
        SelectField,
        TextareaField,
        CheckboxField,
        RadioGroupField,
    },
    formComponents: { SubmitButton },
})
