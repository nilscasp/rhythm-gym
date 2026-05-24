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
    // Phase 4: legacy v1 + auto-generated archives outside Next compile path
    "_legacy/**",
    "rhythm-gym-bundle/**",
    "scripts/**",
    ".claude/**",
  ]),
  {
    rules: {
      // Project uses German curly quotes („…") + ' inline in JSX body text.
      // These are valid UTF-8 and render correctly; the rule's "could be confused
      // with attribute quotes" risk doesn't apply to our German prose.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
