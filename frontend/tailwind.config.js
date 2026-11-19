/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0f1f35", dark: "#1e3a5c" },
        brand: { DEFAULT: "#2a6c4a" },
        seth: "#2563eb",
        munshi: "#0f766e",
        labour: "#c2410c",
      },
      boxShadow: {
        field: "0 1px 2px rgba(15,23,42,.06), 0 6px 14px rgba(15,23,42,.05)",
      },
    },
  },
  plugins: [],
};
