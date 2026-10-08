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
        "bg-sora": "#FBF6F0",       // Crema Vainilla
        "primary-sora": "#C2665B",  // Terracota / Coral
        "primary-hover": "#A85248",
        "text-sora": "#1E1815",     // Espresso Oscuro
        "border-sora": "#EADCCF",   // Lino Suave
        whatsapp: "#25D366",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        sora: "1rem",
        "sora-lg": "1.5rem",
        "sora-xl": "2rem",
      },
      boxShadow: {
        sora: "0 4px 20px -2px rgba(30, 24, 21, 0.06)",
        "sora-hover": "0 8px 30px -4px rgba(30, 24, 21, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
