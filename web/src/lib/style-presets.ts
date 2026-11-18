import { defaultDesign } from "@/lib/qr"
import type { Design } from "@/lib/qr"

type Preset = { id: string; name: string; design: Omit<Design, "logo"> }

const base = defaultDesign()

function preset(
    id: string,
    name: string,
    dots: Design["dots"],
    corners: {
        square: Design["cornersSquare"]["style"]
        dot: Design["cornersDot"]["style"]
        color: string
        dotColor?: string
    },
    extra: { background?: string; frame?: Design["frame"]; shape?: Design["shape"] } = {},
): Preset {
    return {
        id,
        name,
        design: {
            ...base,
            dots,
            shape: extra.shape ?? "square",
            background: { color: extra.background ?? "#ffffff", transparent: false },
            cornersSquare: { style: corners.square, color: corners.color },
            cornersDot: { style: corners.dot, color: corners.dotColor ?? corners.color },
            frame: extra.frame ?? base.frame,
        },
    }
}

/**
 * Ready-made looks, one click each. Every one keeps dark modules on a light ground with strong contrast, so all of
 * them pass the scannability check. The logo is never touched.
 */
export const STYLE_PRESETS: Array<Preset> = [
    preset(
        "classique",
        "Classique",
        { style: "square", color: "#000000" },
        { square: "square", dot: "square", color: "#000000" },
    ),
    preset(
        "doux",
        "Doux",
        { style: "rounded", color: "#14161f" },
        { square: "extra-rounded", dot: "dot", color: "#14161f" },
    ),
    preset(
        "outremer",
        "Outremer",
        { style: "dots", color: "#1f2bc2" },
        { square: "extra-rounded", dot: "dot", color: "#1f2bc2" },
    ),
    preset(
        "foret",
        "Forêt",
        { style: "classy-rounded", color: "#14532d" },
        { square: "extra-rounded", dot: "dot", color: "#166534" },
    ),
    preset(
        "bordeaux",
        "Bordeaux",
        { style: "classy", color: "#6b1d2a" },
        { square: "square", dot: "square", color: "#6b1d2a" },
    ),
    preset(
        "nuit",
        "Nuit",
        { style: "extra-rounded", color: "#0f172a" },
        { square: "dot", dot: "dot", color: "#2d3cf0", dotColor: "#0f172a" },
    ),
    preset(
        "terre",
        "Terre",
        { style: "rounded", color: "#5b3a1a" },
        { square: "extra-rounded", dot: "square", color: "#9a3412" },
        { background: "#fff7ed" },
    ),
    preset(
        "menthe",
        "Menthe",
        { style: "dots", color: "#064e3b" },
        { square: "extra-rounded", dot: "dot", color: "#047857" },
        { background: "#ecfdf5" },
    ),
    preset(
        "rond",
        "Rond",
        { style: "dots", color: "#14161f" },
        { square: "dot", dot: "dot", color: "#14161f" },
        { shape: "circle" },
    ),
    preset(
        "menu",
        "Menu",
        { style: "rounded", color: "#111827" },
        { square: "extra-rounded", dot: "dot", color: "#111827" },
        {
            frame: { style: "box", text: "Notre menu", color: "#111827" },
        },
    ),
    preset(
        "scannez",
        "Scannez-moi",
        { style: "square", color: "#1f2bc2" },
        { square: "square", dot: "square", color: "#1f2bc2" },
        {
            frame: { style: "speech", text: "Scannez-moi !", color: "#1f2bc2" },
        },
    ),
    preset(
        "badge",
        "Badge",
        { style: "extra-rounded", color: "#14161f" },
        { square: "extra-rounded", dot: "dot", color: "#14161f" },
        {
            frame: { style: "badge", text: "Suivez-nous", color: "#14161f" },
        },
    ),
]

/** Applies a preset over a design, keeping the logo (and dropping the frame when frames are not available). */
export function applyPreset(design: Design, chosen: Preset, withFrame: boolean): Design {
    return { ...chosen.design, logo: design.logo, frame: withFrame ? chosen.design.frame : design.frame }
}
