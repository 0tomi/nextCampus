import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "docs/MobileDesign/**",
    // Scripts de skills locales (CommonJS): no son código de la app.
    ".agents/**",
    ".claude/**",
  ]),
  {
    rules: {
      // init.md: cualquier `any` en el código es ERROR, no warning.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);

export default eslintConfig;
