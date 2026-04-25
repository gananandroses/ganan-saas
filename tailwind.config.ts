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
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        accent: {
          50: "#fefce8",
          100: "#fef9c3",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
        },
        earth: {
          100: "#fdf8f0",
          200: "#f5e6d3",
          300: "#e8c99a",
          400: "#d4a76a",
          500: "#b8860b",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        hebrew: ["Heebo", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
