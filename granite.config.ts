import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'mbtiju',
  brand: {
    displayName: '엠비티아이주', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#FFCCBC', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: 'https://static.toss.im/appsintoss/36159/8da23a74-f410-404a-81aa-242d7c2c423f.png', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: '172.30.1.57',
    port: 3000,
    commands: {
      dev: 'npm start --host',
      build: 'npm run build',
    },
  },
  permissions: [],
  outdir: 'build',
});
