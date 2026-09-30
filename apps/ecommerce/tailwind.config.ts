/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        container: {
            center: true,
            padding: "1rem",
        },

        screens: {
            xs: "450px", // => @media (min-width: 450px) { ... }
            sm: "575px", // => @media (min-width: 576px) { ... }
            md: "768px", // => @media (min-width: 768px) { ... }
            lg: "992px", // => @media (min-width: 992px) { ... }
            xl: "1200px", // => @media (min-width: 1200px) { ... }
            "2xl": "1400px", // => @media (min-width: 1400px) { ... }
        },
        extend: {
            colors: {
                // Tailwind
                current: "currentColor",
                transparent: "transparent",
                white: "#FFFFFF",
                black: "#121723",

                gray: {
                    ...colors.gray,
                    dark: "#1E232E",
                    light: "#F0F2F9",
                },

                stroke: {
                    stroke: "#E3E8EF",
                    dark: "#353943",
                },

                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },

                // Tema dinâmico
                bg: "rgb(var(--bg-current) / <alpha-value>)",
                card: "rgb(var(--card-current) / <alpha-value>)",
                border: "rgb(var(--border-current) / <alpha-value>)",

                primary: "rgb(var(--primary-current) / <alpha-value>)",
                secondary: "rgb(var(--secondary-current) / <alpha-value>)",

                button: "rgb(var(--button-current) / <alpha-value>)",
                buttonHover: "rgb(var(--buttonHover-current) / <alpha-value>)",
                buttonText: "rgb(var(--buttonText-current) / <alpha-value>)",

                hover: "rgb(var(--hover-current) / <alpha-value>)",
                link: "rgb(var(--link-current) / <alpha-value>)",

                footer: "rgb(var(--footer-current) / <alpha-value>)",
            },

            boxShadow: {
                signUp: "0px 5px 10px rgba(4, 10, 34, 0.2)",
                one: "0px 2px 3px rgba(7, 7, 77, 0.05)",
                two: "0px 5px 10px rgba(6, 8, 15, 0.1)",
                three: "0px 5px 15px rgba(6, 8, 15, 0.05)",
                sticky: "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)",
                "sticky-dark": "inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)",
                "feature-2": "0px 10px 40px rgba(48, 86, 211, 0.12)",
                submit: "0px 5px 20px rgba(4, 10, 34, 0.1)",
                "submit-dark": "0px 5px 20px rgba(4, 10, 34, 0.1)",
                btn: "0px 1px 2px rgba(4, 10, 34, 0.15)",
                "btn-hover": "0px 1px 2px rgba(0, 0, 0, 0.15)",
                "btn-light": "0px 1px 2px rgba(0, 0, 0, 0.1)",
                card: "0 4px 12px rgba(0,0,0,0.05)",
                header: "0 2px 6px rgba(0,0,0,0.05)",
            },
            dropShadow: {
                three: "0px 5px 15px rgba(6, 8, 15, 0.05)",
            },
        }
    },
    plugins: [],
};