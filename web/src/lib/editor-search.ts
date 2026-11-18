import { z } from "zod"

import { KINDS } from "@/lib/qr"

/** ?etape=1|2|3&type=<kind>: the editor's position, in the URL so a reload or "back" keeps it. */
export const editorSearch = z.object({
    etape: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .optional()
        .catch(undefined),
    type: z.enum(KINDS).optional().catch(undefined),
})
