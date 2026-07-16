import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

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
    "prisma/generated/**",
    "docs/MobileDesign/**",
    // Scripts de skills locales (CommonJS): no son código de la app.
    ".agents/**",
    ".claude/**",
    "docs/**",
  ]),
  {
    rules: {
      // init.md: cualquier `any` en el código es ERROR, no warning.
      "@typescript-eslint/no-explicit-any": "error",

      // Reglas recomendadas de accesibilidad (el plugin jsx-a11y ya está provisto por eslint-config-next)
      ...jsxA11y.flatConfigs.recommended.rules,

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Antipatrones React
      "react/no-array-index-key": "warn",
      "react/no-unstable-nested-components": "error",
      "react/button-has-type": "error",

      // TypeScript generales (no requieren info de tipos)
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  // Reglas de TypeScript que requieren información de tipos
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  prettier,
]);

export default eslintConfig;
