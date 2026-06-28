/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'], theme: { extend: { colors: { ink:'#18201d', paper:'#f4f3ed', acid:'#d6ff5c', moss:'#526b59' }, fontFamily:{ sans:['Inter','ui-sans-serif','system-ui'], display:['Georgia','serif'] }, boxShadow:{soft:'0 16px 45px rgba(24,32,29,.10)'} } }, plugins: [] }
