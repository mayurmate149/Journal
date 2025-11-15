import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          50: "#f3fbf6",
          100: "#e6f7ee",
          200: "#bfedd2",
          300: "#99e3b6",
          400: "#4fd882",
          500: "#16a34a",
          600: "#12843e",
          700: "#0e632f",
          800: "#0b421f",
          900: "#05210f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
      },
    },
  },
  plugins: [
   
  ],
  darkMode: "class",
};

export default config;