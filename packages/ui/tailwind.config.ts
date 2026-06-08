import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../apps/web/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nexora EDU brand tokens
        navy: {
          DEFAULT: "#1A3A5C",
          50: "#E8EEF5",
          100: "#C5D4E5",
          200: "#9DB7D3",
          300: "#7499C1",
          400: "#4D7BAE",
          500: "#1A3A5C",
          600: "#163352",
          700: "#122B45",
          800: "#0D2238",
          900: "#081A2B",
        },
        teal: {
          DEFAULT: "#0D9488",
          50: "#E6F7F6",
          100: "#B3E8E5",
          200: "#80D9D4",
          300: "#4DCAC3",
          400: "#26BBB2",
          500: "#0D9488",
          600: "#0B837A",
          700: "#09716A",
          800: "#075F59",
          900: "#054D48",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
