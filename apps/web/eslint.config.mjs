import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

import baseConfig from "@lunchlink/eslint-config";

/** @type {import("eslint").Linter.Config[]} */
export default tseslint.config(
  ...baseConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
);
