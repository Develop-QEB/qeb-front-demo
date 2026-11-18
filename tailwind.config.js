/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Colores de marca de las vistas para clientes. Las variables las define
        // aplicarVariablesMarca() (src/config/marca.ts) al arrancar la app.
        marca: {
          primario: "rgb(var(--marca-primario) / <alpha-value>)",
          oscuro: "rgb(var(--marca-oscuro) / <alpha-value>)",
          acento: "rgb(var(--marca-acento) / <alpha-value>)",
          "acento-oscuro": "rgb(var(--marca-acento-oscuro) / <alpha-value>)",
          claro: "rgb(var(--marca-claro) / <alpha-value>)",
          "acento-claro": "rgb(var(--marca-acento-claro) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        scaleIn: 'scaleIn 0.6s ease-out',
        fadeIn: 'fadeIn 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
