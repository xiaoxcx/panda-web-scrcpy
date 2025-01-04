import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    {
      name: 'vite-plugin-binary',
      transform(code, id) {
        if (id.endsWith('?binary')) {
          const buffer = Buffer.from(code);
          return {
            code: `export default new Uint8Array(${JSON.stringify(Array.from(buffer))})`,
            map: null
          };
        }
      }
    }
  ],
  base: '/web-scrcpy/', // 设置为您的 GitHub 仓库名
});
