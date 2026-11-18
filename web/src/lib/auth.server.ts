import { betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { PostgresDialect } from "kysely"
import { Pool } from "pg"

const production = process.env.NODE_ENV === "production"
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3110"

const pool = new Pool({
    connectionString: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL,
    idleTimeoutMillis: 10_000,
})
pool.on("error", (error) => console.warn(`auth database: idle connection dropped (${error.message})`))

export const auth = betterAuth({
    appName: "qrstats",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "http://localhost:3110,http://127.0.0.1:3110").split(
        ",",
    ),
    // Schema-qualified queries, not a search_path option: connection poolers (Neon, PgBouncer) refuse it.
    database: { dialect: new PostgresDialect({ pool }), type: "postgres", schemaName: "better_auth" },
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100 },
    advanced: {
        cookiePrefix: "qrstats",
        useSecureCookies: production,
    },
    plugins: [
        jwt({
            jwks: { keyPairConfig: { alg: "EdDSA", crv: "Ed25519" } },
            jwt: {
                issuer: baseURL,
                audience: "qrstats-api",
                expirationTime: "15m",
                definePayload: ({ user }) => ({ email: user.email, name: user.name }),
            },
        }),
        tanstackStartCookies(),
    ],
})
