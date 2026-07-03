/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0f1f35", dark: "#1e3a5c" },
        brand: { DEFAULT: "#2a6c4a" },
      },
    },
  },
  plugins: [],
};
