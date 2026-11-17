import { Navigate, useLocation } from "@tanstack/react-router"
import { useState } from "react"

/** Sends a signed-out visitor to sign-in, then back to the page they asked for. */
export function SignInRedirect() {
    const href = useLocation({ select: (location) => location.href })
    // Frozen at mount: while the redirect is pending the location already reads /connexion?redirect=..., and following
    // it would chain redirects forever and lock the page.
    const [from] = useState(href)
    return <Navigate to="/connexion" search={{ redirect: from }} replace />
}
