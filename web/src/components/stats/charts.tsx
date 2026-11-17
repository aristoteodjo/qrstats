import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { TooltipProps } from "recharts"

import { count, shortDay } from "@/lib/format"
import type { Stats } from "@/lib/stats"

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const

function TooltipBox({ title, rows }: { title: string; rows: Array<{ label: string; value: number; color?: string }> }) {
    return (
        <div className="bg-popover text-popover-foreground grid gap-1 rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="font-medium">{title}</p>
            {rows.map((row) => (
                <p key={row.label} className="flex items-center gap-2">
                    {row.color ? <span className="size-2.5 rounded-full" style={{ background: row.color }} aria-hidden="true" /> : null}
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="ml-auto pl-3 font-medium tabular-nums">{count(row.value)}</span>
                </p>
            ))}
        </div>
    )
}

const SERIES = [
    { key: "scans", label: "Scans", color: "var(--chart-1)" },
    { key: "uniques", label: "Visiteurs uniques", color: "var(--chart-2)" },
] as const

/** Scans and unique visitors per day: two lines on one axis (same unit), legend above, crosshair tooltip. */
export function ScansChart({ series }: { series: Stats["series"] }) {
    const ticks = Math.min(series.length, 8)
    return (
        <figure className="grid gap-3">
            <figcaption className="flex flex-wrap gap-4 text-sm">
                {SERIES.map((s) => (
                    <span key={s.key} className="flex items-center gap-2">
                        <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                        {s.label}
                    </span>
                ))}
            </figcaption>
            <div className="h-72" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={shortDay}
                            interval={Math.max(0, Math.ceil(series.length / ticks) - 1)}
                            {...axis}
                        />
                        <YAxis allowDecimals={false} width={48} {...axis} />
                        <Tooltip
                            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                            content={({ active, payload, label }: TooltipProps<number, string>) =>
                                active && payload?.length ? (
                                    <TooltipBox
                                        title={shortDay(String(label))}
                                        rows={SERIES.map((s) => ({
                                            label: s.label,
                                            color: s.color,
                                            value: Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0),
                                        }))}
                                    />
                                ) : null
                            }
                        />
                        {SERIES.map((s) => (
                            <Line
                                key={s.key}
                                dataKey={s.key}
                                type="monotone"
                                stroke={s.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)" }}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </figure>
    )
}

/** One series over fixed slots (hours, weekdays): thin bars, rounded at the data end. */
export function SlotsChart({ values, labels, unit }: { values: Array<number>; labels: Array<string>; unit: string }) {
    const data = values.map((value, index) => ({ label: labels[index], value }))
    return (
        <div className="h-48" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="label" interval={labels.length > 12 ? 2 : 0} {...axis} />
                    <YAxis allowDecimals={false} width={40} {...axis} />
                    <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        content={({ active, payload }: TooltipProps<number, string>) =>
                            active && payload?.length ? (
                                <TooltipBox
                                    title={`${unit} ${String(payload[0].payload.label)}`}
                                    rows={[{ label: "Scans", value: Number(payload[0].value ?? 0) }]}
                                />
                            ) : null
                        }
                    />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
