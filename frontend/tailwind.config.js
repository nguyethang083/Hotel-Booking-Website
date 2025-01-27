/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'TradeGothic': ['Trade Gothic LT Extended', 'sans-serif'],
        'Montserrat': ['Montserrat', 'sans-serif'],
      },
      colors: {
        'mint': '#8DD3BB', // Add your custom color here
      },
    },
    container: {
      padding: {
        md: "10rem",
      }
    },
  },
  plugins: [],
}

