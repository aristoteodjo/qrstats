import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { useState } from "react"

import { Kpi, KpiStrip } from "@/components/dash/kpi"
import { KindIcon } from "@/components/qr/kind-icon"
import { ScansChart, SlotsChart } from "@/components/stats/charts"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage } from "@/lib/api"
import { change, count, percent, shortDay } from "@/lib/format"
import type { Kind } from "@/lib/qr"
import { DIMENSIONS, PERIODS, WEEKDAYS, bucketLabel, statsQuery } from "@/lib/stats"
import type { Bucket, Dimension, Period } from "@/lib/stats"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour}h`)

/** Every figure of the tracking: totals with the previous period, the daily curve, then where and how people scan. */
export function StatsBoard({ qrCodeId }: { qrCodeId?: string }) {
    const [period, setPeriod] = useState<Period>("30")
    const stats = useQuery(statsQuery(period, qrCodeId))

    return (
        <section aria-label="Statistiques" className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                    {stats.data ? `Du ${shortDay(stats.data.from)} au ${shortDay(stats.data.to)}` : " "}
                </p>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={period}
                    onValueChange={(value) => value && setPeriod(value as Period)}
                    aria-label="Période"
                >
                    {PERIODS.map((p) => (
                        <ToggleGroupItem key={p.value} value={p.value} className="min-h-11 px-3">
                            {p.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {stats.isPending ? (
                <div className="grid gap-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-80" />
                </div>
            ) : stats.isError ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage(stats.error, "Les statistiques n'ont pas pu être chargées.")}
                </p>
            ) : (
                <>
                    <div className="bg-card overflow-hidden rounded-xl border">
                        <KpiStrip label="Chiffres clés" className="border-b-0 bg-transparent">
                            <Kpi
                                label="Scans"
                                value={count(stats.data.scans)}
                                aside={<Trend now={stats.data.scans} before={stats.data.previous.scans} />}
                            />
                            <Kpi
                                label="Visiteurs uniques"
                                value={count(stats.data.uniques)}
                                aside={<Trend now={stats.data.uniques} before={stats.data.previous.uniques} />}
                                detail="Comptés par jour, sans conserver d'adresse IP"
                            />
                            <Kpi
                                label="Scans par visiteur"
                                value={
                                    stats.data.uniques
                                        ? (stats.data.scans / stats.data.uniques).toFixed(1).replace(".", ",")
                                        : "0"
                                }
                            />
                            <Kpi label="Heure de pointe" value={peakHour(stats.data.hours)} />
                        </KpiStrip>
                    </div>

                    {stats.data.scans === 0 ? (
                        <div className="bg-card text-muted-foreground grid place-items-center gap-2 rounded-xl border p-10 text-center text-sm">
                            <p className="text-foreground font-heading text-lg font-semibold">
                                Aucun scan sur cette période
                            </p>
                            <p>Les scans apparaissent ici dès qu'un téléphone ouvre le code imprimé.</p>
                        </div>
                    ) : (
                        <>
                            <Panel title="Scans par jour">
                                <ScansChart series={stats.data.series} />
                                <details className="text-sm">
                                    <summary className="text-primary min-h-11 cursor-pointer content-center">
                                        Voir les chiffres en tableau
                                    </summary>
                                    <div className="max-h-72 overflow-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-muted-foreground">
                                                <tr>
                                                    <th className="py-2 font-medium">Jour</th>
                                                    <th className="py-2 text-right font-medium">Scans</th>
                                                    <th className="py-2 text-right font-medium">Visiteurs uniques</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.data.series.map((point) => (
                                                    <tr key={point.date} className="border-t">
                                                        <td className="py-1.5">{shortDay(point.date)}</td>
                                                        <td className="py-1.5 text-right tabular-nums">
                                                            {count(point.scans)}
                                                        </td>
                                                        <td className="py-1.5 text-right tabular-nums">
                                                            {count(point.uniques)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            </Panel>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Panel title="Heures de scan" note="Dans votre fuseau horaire">
                                    <SlotsChart values={stats.data.hours} labels={HOURS} unit="À" />
                                    <SrList
                                        label="Scans par heure"
                                        items={stats.data.hours.map((value, hour) => [HOURS[hour], value])}
                                    />
                                </Panel>
                                <Panel title="Jours de la semaine">
                                    <SlotsChart values={stats.data.weekdays} labels={WEEKDAYS} unit="Le" />
                                    <SrList
                                        label="Scans par jour de la semaine"
                                        items={stats.data.weekdays.map((value, day) => [WEEKDAYS[day], value])}
                                    />
                                </Panel>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {(Object.keys(DIMENSIONS) as Array<Dimension>)
                                    .filter(
                                        (dimension) =>
                                            !dimension.startsWith("utm_") ||
                                            hasValues(stats.data.breakdowns[dimension]),
                                    )
                                    .map((dimension) => (
                                        <Panel
                                            key={dimension}
                                            title={DIMENSIONS[dimension]}
                                            note={
                                                dimension === "country" || dimension === "city"
                                                    ? locationNote(stats.data.breakdowns[dimension])
                                                    : undefined
                                            }
                                        >
                                            <BarList
                                                dimension={dimension}
                                                buckets={stats.data.breakdowns[dimension] ?? []}
                                                total={stats.data.scans}
                                            />
                                        </Panel>
                                    ))}
                            </div>

                            {!qrCodeId && stats.data.top_codes.length > 0 ? (
                                <Panel title="QR codes les plus scannés">
                                    <ol className="grid gap-1">
                                        {stats.data.top_codes.map((code, index) => (
                                            <li key={code.id}>
                                                <Link
                                                    to="/qr-codes/$id"
                                                    params={{ id: code.id }}
                                                    className="hover:bg-muted flex min-h-12 items-center gap-3 rounded-lg px-2"
                                                >
                                                    <span className="text-muted-foreground w-5 text-sm tabular-nums">
                                                        {index + 1}
                                                    </span>
                                                    <KindIcon kind={code.kind as Kind} className="size-8" />
                                                    <span className="flex-1 truncate font-medium">{code.name}</span>
                                                    <span className="tabular-nums">{count(code.scans)} scans</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ol>
                                </Panel>
                            ) : null}
                        </>
                    )}
                </>
            )}
        </section>
    )
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
    return (
        <section className="bg-card grid content-start gap-4 rounded-xl border p-4 sm:p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading font-semibold">{title}</h2>
                {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
            </header>
            {children}
        </section>
    )
}

function Trend({ now, before }: { now: number; before: number }) {
    const delta = change(now, before)
    if (delta === null) return <span>période précédente : {count(before)}</span>
    const up = delta >= 0
    const Icon = up ? TrendingUpIcon : TrendingDownIcon
    return (
        <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-positive" : "text-destructive")}>
            <Icon className="size-3.5" aria-hidden="true" />
            {up ? "+" : ""}
            {percent(delta)}
            <span className="sr-only"> par rapport à la période précédente</span>
        </span>
    )
}

function peakHour(hours: Array<number>) {
    const max = Math.max(...hours)
    if (max <= 0) return "—"
    const hour = hours.indexOf(max)
    return `${hour}h–${hour + 1}h`
}

const hasValues = (buckets: Array<Bucket> | undefined) => (buckets ?? []).some((b) => b.key !== "")

function locationNote(buckets: Array<Bucket> | undefined) {
    return (buckets ?? []).every((b) => b.key === "") ? "Disponible une fois déployé (Vercel ou Cloudflare)" : undefined
}

/** A breakdown as labelled bars: the name and figure are text, the bar only helps comparing. */
function BarList({ dimension, buckets, total }: { dimension: Dimension; buckets: Array<Bucket>; total: number }) {
    if (buckets.length === 0) return <p className="text-muted-foreground text-sm">Aucune donnée.</p>
    const max = Math.max(...buckets.map((b) => b.count), 1)
    return (
        <ul className="grid gap-2.5">
            {buckets.map((bucket) => (
                <li key={bucket.key} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{bucketLabel(dimension, bucket.key)}</span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                            <span className="text-foreground font-medium">{count(bucket.count)}</span> (
                            {percent(total ? bucket.count / total : 0)})
                        </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                        <div
                            className="bg-chart-1 h-full rounded-full"
                            style={{ width: `${(bucket.count / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    )
}

function SrList({ label, items }: { label: string; items: Array<[string, number]> }) {
    return (
        <ul aria-label={label} className="sr-only">
            {items.map(([name, value]) => (
                <li key={name}>
                    {name} : {value}
                </li>
            ))}
        </ul>
    )
}
