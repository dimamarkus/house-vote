import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "generated/**",
      "next-env.d.ts",
      "node_modules/**",
      "eslint.config.mjs",
      "next.config.ts",
      "prisma.config.ts",
    ],
  },
];

export default config;