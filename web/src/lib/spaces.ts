export type Space = { kind: "site" } | { kind: "app" }

type SpaceKind = Space["kind"]
export type SpaceHosts = Record<string, SpaceKind>

const RESERVED: Record<string, Space> = { www: { kind: "site" }, app: { kind: "app" } }
const NAMED: ReadonlyArray<SpaceKind> = ["site", "app"]

/** Hosts that stand for a whole space, from "host=space,host=space", for deployments without a domain of their own. */
export function parseSpaceHosts(value: string | undefined): SpaceHosts {
    const hosts: SpaceHosts = {}
    for (const entry of (value ?? "").split(",")) {
        const [host, space] = entry.split("=").map((part) => part.trim().toLowerCase())
        if (host && NAMED.includes(space as SpaceKind)) hosts[host] = space as SpaceKind
    }
    return hosts
}

/** The host picks the interface, never the rights. Anything but the apex, www. and app. is unknown (404). */
export function resolveSpace(
    host: string | null | undefined,
    rootDomain: string,
    hosts: SpaceHosts = {},
): Space | null {
    if (!host) return null
    const hostname = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "")
    if (Object.hasOwn(hosts, hostname)) return { kind: hosts[hostname] }
    const root = rootDomain.toLowerCase()
    if (hostname === root) return { kind: "site" }
    if (!hostname.endsWith(`.${root}`)) return null
    const label = hostname.slice(0, -(root.length + 1))
    return Object.hasOwn(RESERVED, label) ? RESERVED[label] : null
}

export function spaceUrl(space: SpaceKind, rootDomain: string, protocol: string, port: string, hosts: SpaceHosts = {}) {
    const own = Object.keys(hosts).find((host) => hosts[host] === space)
    if (own) return `${protocol}//${own}`
    const label = space === "app" ? "app." : ""
    return `${protocol}//${label}${rootDomain}${port ? `:${port}` : ""}`
}
