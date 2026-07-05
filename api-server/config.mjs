import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')

function parseEnvValue(value) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export function loadEnv() {
  if (!fs.existsSync(envPath)) {
    return
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1))

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

export function getConfig() {
  return {
    apiPort: Number(process.env.PORT || 9000),
    apiBase: (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 9000}`).replace(/\/$/, ''),
    siteUrl: (process.env.SITE_URL || 'http://localhost:9001').replace(/\/$/, ''),
    sessionSecret: process.env.NUXT_SESSION_PASSWORD || process.env.SESSION_SECRET || process.env.JWT_SECRET,
    naverClientId: process.env.NAVER_CLIENT_ID,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET,
    naverCallbackUrl: process.env.NAVER_CALLBACK_URL,
    kakaoClientId: process.env.KAKAO_CLIENT_ID,
    kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET,
    kakaoCallbackUrl: process.env.KAKAO_CALLBACK_URL,
    uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.SITE_URL || 'http://localhost:9001')
      .split(',')
      .map(o => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    // TEMP(dev): when 'true', skip login/role checks for backend access. Never set on production.
    authBypass: process.env.AUTH_BYPASS === 'true',
  }
}
