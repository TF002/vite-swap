import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/rpc': {
        target: 'https://rpc-testnet.chainlessdw20.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rpc/, '/'),
      },
      '/wallet-api': {
        target: 'http://mmt-user.budingcc.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wallet-api/, ''),
      },
      '/bridge-api': {
        target: 'https://dw20-lock-relayer.chainlessdw20.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/bridge-api/, ''),
      },
    },
  },
})
