import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic aliases — components reference these when a token feels clearer
        // than a raw slate-* class. Existing slate utilities continue to work.
        surface: {
          DEFAULT: "rgb(15 23 42 / 0.85)", // slate-900/85
          raised: "rgb(30 41 59 / 0.70)",  // slate-800/70
          ring: "rgb(255 255 255 / 0.10)",
        },
      },
      boxShadow: {
        sheet:
          "0 -20px 60px -20px rgba(0,0,0,0.6), 0 -2px 8px -2px rgba(0,0,0,0.35)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
