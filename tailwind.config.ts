import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F7F2",
        foreground: "#1A221E",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F3EFE6",
          elevated: "#FAFAF7",
        },
        ink: {
          DEFAULT: "#1A221E",
          muted: "#6C756E",
          subtle: "#9BA39E",
        },
        forest: {
          DEFAULT: "#163C29",
          dark: "#0F281B",
          light: "#23543B",
        },
        lime: {
          DEFAULT: "#C8E27A",
          dark: "#B2D354",
          light: "#DDF09E",
        },
        cream: {
          DEFAULT: "#EDE8DD",
          dark: "#DFD7C7",
        },
        border: "rgba(22, 60, 41, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "sans-serif"],
        heading: ["var(--font-sans)", "Plus Jakarta Sans", "sans-serif"],
        script: ["var(--font-script)", "Caveat", "cursive"],
      },
      boxShadow: {
        spatial: "0 4px 20px -2px rgba(22, 60, 41, 0.06), 0 0 1px 1px rgba(22, 60, 41, 0.04)",
        "spatial-lg": "0 12px 36px -4px rgba(22, 60, 41, 0.09), 0 0 1px 1px rgba(22, 60, 41, 0.05)",
        card: "0 2px 12px -2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(22, 60, 41, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(22, 60, 41, 0.1), 0 0 0 1px rgba(22, 60, 41, 0.12)",
      },
      borderRadius: {
        spatial: "20px",
        "spatial-sm": "12px",
        "spatial-lg": "24px",
        pill: "9999px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
