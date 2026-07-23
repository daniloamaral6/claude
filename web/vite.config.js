import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Diário de Saúde',
        short_name: 'Diário',
        description: 'Acompanhamento de peso, treino e exames',
        theme_color: '#2F6F62',
        background_color: '#F5F6F3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
