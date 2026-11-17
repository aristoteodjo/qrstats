import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHost, getRequestUrl } from "@tanstack/react-start/server"

import { parseSpaceHosts, resolveSpace, spaceUrl } from "@/lib/spaces"

export const ROOT_DOMAIN = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined) ?? "localhost"
export const SPACE_HOSTS = parseSpaceHosts(import.meta.env.VITE_SPACE_HOSTS as string | undefined)

export const currentHost = createIsomorphicFn()
    .server(() => getRequestHost({ xForwardedHost: true }))
    .client(() => window.location.host)

export const currentSpace = () => resolveSpace(currentHost(), ROOT_DOMAIN, SPACE_HOSTS)

export const currentOrigin = createIsomorphicFn()
    .server(() => {
        const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
        return { protocol: url.protocol, port: url.port }
    })
    .client(() => ({ protocol: window.location.protocol, port: window.location.port }))

/** Absolute link into the app space (sign-in, dashboard) from the public site. */
export function appHref(path: string) {
    const { protocol, port } = currentOrigin()
    return `${spaceUrl("app", ROOT_DOMAIN, protocol, port, SPACE_HOSTS)}${path}`
}

export function siteHref(path: string) {
    const { protocol, port } = currentOrigin()
    return `${spaceUrl("site", ROOT_DOMAIN, protocol, port, SPACE_HOSTS)}${path}`
}
