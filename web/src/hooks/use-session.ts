import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { authClient, forgetApiToken } from "@/lib/auth-client"

export function useSession() {
    const session = authClient.useSession()
    const queryClient = useQueryClient()

    const signOut = useCallback(async () => {
        await authClient.signOut()
        forgetApiToken()
        queryClient.clear()
    }, [queryClient])

    return {
        user: session.data?.user ?? null,
        // A sign-in refetches the session in the background: deciding during that refetch would bounce to sign-in.
        pending: session.isPending || session.isRefetching,
        signOut,
    }
}
