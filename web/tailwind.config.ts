import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0a66c2", dark: "#084e96", soft: "#eaf2fb" },
      },
    },
  },
  plugins: [],
} satisfies Config;
