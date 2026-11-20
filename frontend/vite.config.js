import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), 'VITE_')
  const backend = fileURLToPath(new URL('../backend/', import.meta.url))
  const backendEnv = loadEnv(mode, backend, 'PORT')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || `http://127.0.0.1:${backendEnv.PORT || 5000}`,
          // Preserve the browser's host so same-origin POSTs pass the API's origin check,
          // including when Vite selects another available development port.
          changeOrigin: false,
        },
      },
    },
  }
})
