import { z } from "zod"

/** Field rules shared by sign-in and sign-up, checked on blur and again on submit. */
export const emailRule = z
    .string()
    .trim()
    .min(1, "Saisissez votre adresse e-mail.")
    .pipe(z.email("Adresse e-mail invalide."))
export const nameRule = z
    .string()
    .trim()
    .min(2, "Saisissez votre nom (2 caractères au moins).")
    .max(80, "80 caractères au maximum.")
export const newPasswordRule = z
    .string()
    .min(10, "10 caractères au moins.")
    .max(128, "128 caractères au maximum.")
    .refine((value) => /[a-zA-Z]/.test(value) && /[^a-zA-Z]/.test(value), "Mélangez lettres et chiffres ou symboles.")
export const currentPasswordRule = z.string().min(1, "Saisissez votre mot de passe.")

/** Better Auth error codes in words a person can act on. */
export function authError(code: string | undefined, fallback: string): string {
    switch (code) {
        case "INVALID_EMAIL_OR_PASSWORD":
            return "E-mail ou mot de passe incorrect."
        case "USER_ALREADY_EXISTS":
        case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
            return "Un compte existe déjà avec cette adresse. Connectez-vous."
        case "PASSWORD_TOO_SHORT":
            return "Mot de passe trop court (10 caractères au moins)."
        case "TOO_MANY_REQUESTS":
            return "Trop de tentatives. Réessayez dans une minute."
        default:
            return fallback
    }
}

/** Unwraps a Better Auth call: data, or an Error carrying a readable message. */
export async function unwrap<T>(
    call: Promise<{ data: T | null; error: { code?: string; message?: string; status?: number } | null }>,
    fallback: string,
): Promise<T> {
    const { data, error } = await call
    if (error || !data)
        throw new Error(
            error?.status === 429
                ? authError("TOO_MANY_REQUESTS", fallback)
                : authError(error?.code, error?.message ?? fallback),
        )
    return data
}
