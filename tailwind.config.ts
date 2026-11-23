import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tomo: {
          bg: "#14181C",
          surface: "#1C2228",
          card: "#242C34",
          border: "#2C3440",
          text: "#99AABB",
          light: "#EEF2F6",
          green: "#00E054",
          amber: "#FF8000",
          blue: "#40BCF4",
          crimson: "#F43F5E",
          paper: "#F4EFE6",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
