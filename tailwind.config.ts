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
        otaku: {
          bg: "#0f0f14",
          card: "#16161e",
          border: "#2a2a36",
          accent: "#7c3aed",
          muted: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};
export default config;
