import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // ink = warm near-black surfaces, tuned to Lichess's default dark theme
        ink: {
          950: "#100f0d",
          900: "#161512", // page background
          800: "#1c1a17",
          700: "#262421", // panels / cards
          600: "#302d29",
          500: "#403d38",
          400: "#6a665f",
        },
        // parchment = neutral light grays (foreground text), Lichess-style
        parchment: {
          DEFAULT: "#b8b8b8",
          50: "#e9e7e3",
          100: "#dedddb",
          200: "#c7c5c1",
          300: "#a3a09b",
          400: "#7f7d77",
          500: "#5c5a55",
        },
        // gold = the configurable accent (links / primary); the rgb triples are
        // set on :root and swapped by the accent-color setting.
        gold: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          leaf: "rgb(var(--accent-hi-rgb) / <alpha-value>)",
          dim: "rgb(var(--accent-dim-rgb) / <alpha-value>)",
        },
        // oxblood = alert / danger
        oxblood: {
          DEFAULT: "#c0413b",
          glow: "#dc5a54",
          deep: "#7e2c28",
        },
        // verdigris = positive / success (used sparingly, not as primary)
        verdigris: {
          DEFAULT: "#629924",
          glow: "#7bb52f",
        },
        // bruise = dusty slate violet (secondary accent)
        bruise: {
          DEFAULT: "#8a88a8",
          glow: "#a7a5c4",
        },
        // mode identities: Nerf mode reads slightly red (oxblood family),
        // Buff mode reads blue (the site's azure). Fixed hex on purpose so
        // the identity survives accent-color settings swaps.
        mode: {
          nerf: "#c0413b",
          nerfGlow: "#dc5a54",
          buff: "#3692e7",
          buffGlow: "#4a9fee",
        },
      },
      boxShadow: {
        leaf: "0 0 24px -10px rgba(54,146,231,0.4)",
        oxblood: "0 0 32px -14px rgba(192,65,59,0.4)",
        plate:
          "0 12px 40px -24px rgba(0,0,0,0.7), 0 1px 0 0 rgba(255,255,255,0.03) inset",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        sigil: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(180deg)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        seal: {
          "0%": { transform: "scale(0.6) rotate(-6deg)", opacity: "0" },
          "70%": { transform: "scale(1.06) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        flicker: "flicker 4.5s ease-in-out infinite",
        sigil: "sigil 60s linear infinite",
        rise: "rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        seal: "seal 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both",
        bob: "bob 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
