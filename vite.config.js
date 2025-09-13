import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175
  },
  esbuild: {
    loader: "jsx",
    include: [
      "src/**/*.js",
      "src/**/*.jsx"
    ]
  }
})