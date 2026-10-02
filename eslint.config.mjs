import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    // Scope matches the previous `next lint` (the Next app only); the standalone
    // Node services keep their own console logging and build output.
    ignores: [
      ".next/**",
      ".next-wp/**",
      ".next-fx/**",
      "dist-server/**",
      ".open-next/**",
      "node_modules/**",
      "**/dist/**",
      "arena-service/**",
      "engine-service/**",
      // Audit repro scripts, run by hand and kept as evidence (BACKLOG.md).
      "docs/audit/**",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
