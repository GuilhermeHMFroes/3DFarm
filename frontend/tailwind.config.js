/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. Diga ao Tailwind onde estão os seus ficheiros React
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // 2. Adicione as suas cores personalizadas (do ficheiro "especificações")
      colors: {
        'farm-dark-blue': '#2C3E50',
        'farm-medium-blue': '#3498DB',
        'farm-orange': '#F39C12',
        'farm-light-grey': '#ECF0F1',
        'farm-medium-grey': '#BDC3C7',
      },
      // 3. Adicione a sua fonte (Montserrat)
      fontFamily: {
        'sans': ['Montserrat', 'sans-serif'],
      },
      // 4. Adicione a sua imagem de fundo
      backgroundImage: {
        // Coloque o seu 'background.jpg' na pasta public/ do React
        'farm-bg': "url('assets/background.png')",
      }
    },
  },
  plugins: [],
}