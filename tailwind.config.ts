import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04060a",
          900: "#070a11",
          850: "#0a0f18",
          800: "#0e1522",
          700: "#16202f",
        },
        neon: {
          cyan: "#22d3ee",
          ice: "#7dd3fc",
          mint: "#22e39a",
          lime: "#a3e635",
          violet: "#a78bfa",
        },
      },
      fontFamily: {
        // No next/font → zero build-time network dependency.
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.16), 0 18px 60px -24px rgba(34,211,238,0.45)",
        "glow-mint":
          "0 0 0 1px rgba(34,227,154,0.18), 0 18px 60px -24px rgba(34,227,154,0.5)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(4,6,10,0) 0%, rgba(4,6,10,0.85) 70%, #04060a 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.35)" },
        },
        sweep: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-8px,0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        breathe: "breathe 2.6s ease-in-out infinite",
        sweep: "sweep 3.2s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
