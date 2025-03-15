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
        primary: {
          DEFAULT: '#292F6C',
          hover: '#4E5489',
          light: '#9599b3',
        },
        accent: {
          red: {
            DEFAULT: '#a81f23',
            dark: '#7e1618',
            light: '#d22230',
          },
          blue: {
            DEFAULT: '#003486',
            light: '#2ea3f2',
          },
        },
        spinner: '#3498db',
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
        poppins: ['var(--font-poppins)'],
        roboto: ['var(--font-roboto)'],
        lora: ['var(--font-lora)'],
      },
      boxShadow: {
        'header': '0 12px 18px -6px rgba(0, 0, 0, 0.3)',
        'nav': '0 2px 5px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-custom': 'linear-gradient(233deg, #5a72ea 28.37%, #8468b1 95.18), #d9d9d9',
      },
      zIndex: {
        'nav': '9999',
        'loader': '1000',
      },
      transitionProperty: {
        'visibility': 'visibility, opacity',
      },
      transitionDuration: {
        '450': '450ms',
      },
      fontSize: {
        'marker': '1.5rem',
      },
      spacing: {
        'nav-submenu': '200%',
      },
      borderRadius: {
        'custom': '32px',
      },
    },
  },
  plugins: [],
};

export default config;
