import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'serve' ? [basicSsl()] : [])
  ],
  server: command === 'serve' ? {
    https: true as any,
    host: true
  } : undefined
}))
