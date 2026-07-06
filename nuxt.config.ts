import { resolveApiPort, resolveWebPort } from './api-server/config.mjs'

const apiPort = resolveApiPort()
const webPort = resolveWebPort()

export default defineNuxtConfig({
  compatibilityDate: '2026-05-26',
  devtools: { enabled: true },
  srcDir: 'app',
  css: ['~/assets/css/main.css', '~/assets/css/default-theme.css'],
  devServer: {
    port: webPort,
  },
  vite: {
    server: {
      hmr: {
        port: webPort,
      },
    },
  },
  runtimeConfig: {
    apiPort,
    // Internal URL used by SSR to call the API server directly (never exposed to browser).
    // In production set API_INTERNAL_BASE=http://localhost:9010 and NUXT_PUBLIC_API_BASE=/api.
    // In development both SSR and browser reach localhost:9010, so leave both at default.
    apiInternalBase: process.env.API_INTERNAL_BASE || `http://localhost:${apiPort}`,
    mongodbAddr: process.env.MONGODB_ADDR,
    mongoUsername: process.env.MONGO_USERNAME,
    mongoPassword: process.env.MONGO_PWD,
    mongoDbName: process.env.MONGO_DBNAME,
    naverClientId: process.env.NAVER_CLIENT_ID,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET,
    kakaoClientId: process.env.KAKAO_CLIENT_ID,
    kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET,
    sessionSecret: process.env.NUXT_SESSION_PASSWORD || process.env.SESSION_SECRET,
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    public: {
      // Empty string = same-origin browser requests ("/api/public/…").
      // In development set NUXT_PUBLIC_API_BASE=http://localhost:9010.
      // Never set this to "/api" in production — that creates double-prefix URLs.
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
      siteUrl: process.env.SITE_URL || process.env.NUXT_SITE_URL || '',
      // Fallback site name used when the DB `settings.siteName` is empty.
      siteName: process.env.SITE_NAME || 'InsureDesign',
    },
  },
  app: {
    head: {
      title: 'InsureDesign',
      htmlAttrs: {
        lang: 'ko',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Markdown, Template, StyleFamily 기반 단일 사이트 InsureDesign',
        },
      ],
    },
  },
})
