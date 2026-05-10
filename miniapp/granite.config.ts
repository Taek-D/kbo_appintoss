import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'kbo-game-miniapp',
  brand: {
    displayName: 'KBO 야구 알리미',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/22611/efb9c5dd-e524-4031-8731-8bae998dbffd.png',
  },
  permissions: [],
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
