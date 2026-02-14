/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0066ff',
                    foreground: '#ffffff',
                },
                background: '#0a0a0c',
                card: '#16161a',
            }
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
