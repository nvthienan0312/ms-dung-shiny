import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        shiny: {
          50: "#fff9eb",
          100: "#feefc7",
          200: "#fde08a",
          300: "#fccc4d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          500: "#334e68",
          800: "#102a43",
          900: "#0b1d3a",
        }
      },
    },
  },
  plugins: [],
};
export default config;
