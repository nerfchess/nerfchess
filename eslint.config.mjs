import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    // Scope matches the previous `next lint` (the Next app only); the standalone
    // Node services keep their own console logging and build output.
    ignores: [
      ".next/**",
      "dist-server/**",
      ".open-next/**",
      "node_modules/**",
      "**/dist/**",
      "arena-service/**",
      "engine-service/**",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
