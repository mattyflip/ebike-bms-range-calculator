import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  
  return {
    plugins: [
      react(),
      ...(isDev ? [basicSsl()] : [])
    ],
    server: isDev ? {
      https: true,
      host: true
    } : undefined
  }
})
