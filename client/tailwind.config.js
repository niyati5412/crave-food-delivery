/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FDFBF7',
          100: '#FBF7EE',
          200: '#F5EEDC',
          300: '#EDE0C4',
          DEFAULT: '#FDFBF7'
        },
        charcoal: {
          800: '#2A2724',
          900: '#1C1A18',
          950: '#121110',
          DEFAULT: '#1C1A18'
        },
        aubergine: {
          700: '#4D1D3E',
          800: '#3A142D',
          900: '#260B1C',
          DEFAULT: '#3A142D'
        },
        citrus: {
          400: '#FF8A50',
          500: '#FF6B35',
          600: '#E85A2A',
          DEFAULT: '#E85A2A'
        },
        accent: {
          olive: '#606C38',
          gold: '#DDA15E'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"Plus Jakarta Sans"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
