import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'mbtiju',
  brand: {
    displayName: '엠비티아이주', // 화면에 노출될 앱의 이름입니다.
    primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: 'https://static.toss.im/appsintoss/36159/8da23a74-f410-404a-81aa-242d7c2c423f.png', // 화면에 노출될 앱의 아이콘 이미지 주소입니다. 빈 문자열로 두면 기본 아이콘이 사용됩니다.
  },
  web: {
    host: '172.30.1.12',
    port: 3000,
    commands: {
      dev: 'npm run start --host',
      build: 'craco build',
    },
  },
  permissions: [],
  outdir: 'build',
});
