//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"
import jsxA11y from "eslint-plugin-jsx-a11y"

export default [
    ...tanstackConfig,
    // Accessibility is a product requirement: these rules fail the lint, they do not warn.
    { files: ["src/**/*.tsx"], ...jsxA11y.flatConfigs.strict },
    {
        rules: {
            "import/no-cycle": "off",
            "import/order": "off",
            "sort-imports": "off",
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/require-await": "off",
            "pnpm/json-enforce-catalog": "off",
        },
    },
    {
        ignores: [".output/**", ".vercel/**", ".nitro/**", "eslint.config.js", "prettier.config.js", "src/components/ui/**", "src/routeTree.gen.ts"],
    },
]
