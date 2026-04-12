import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'kbo-game-miniapp',
  brand: {
    displayName: 'KBO 야구 알리미',
    primaryColor: '#3182F6',
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  outdir: 'dist',
});
