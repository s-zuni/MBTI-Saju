import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'mbtiju',
  brand: {
    displayName: 'mbtiju', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: null, // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'npm start',
      build: 'npm run build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
