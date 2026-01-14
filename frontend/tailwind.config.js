/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        accent: "#F59E0B",
        success: "#10B981",
        danger: "#EF4444",
        background: "#F8FAFC"
      }
    }
  },
  plugins: []
};

