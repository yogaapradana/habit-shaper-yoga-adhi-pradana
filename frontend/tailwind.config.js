/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F3",
        ink: "#1E2A2F",
        muted: "#6B7A80",
        line: "#DDE2DE",
        brand: { DEFAULT: "#0F766E", dark: "#0B5C56", soft: "#DDF0EC" },
      },
    },
  },
  plugins: [],
};
