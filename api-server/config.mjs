import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')

// Single source of truth for the two service ports.
// Override in .env with API_PORT / WEB_PORT. Everything else derives from these.
export const DEFAULT_API_PORT = 9010
export const DEFAULT_WEB_PORT = 9011

export function getPortFromUrl(value, fallback) {
  if (!value) {
    return fallback
  }

  try {
    const url = new URL(value)
    return Number(url.port || (url.protocol === 'https:' ? 443 : 80))
  } catch {
    return fallback
  }
}

// API_PORT is the canonical name; PORT is kept as a backward-compatible alias.
export function resolveApiPort(env = process.env) {
  return Number(env.API_PORT || env.PORT || DEFAULT_API_PORT)
}

// WEB_PORT is canonical; fall back to NUXT_PORT, then the port inside SITE_URL.
export function resolveWebPort(env = process.env) {
  return Number(env.WEB_PORT || env.NUXT_PORT || getPortFromUrl(env.SITE_URL, DEFAULT_WEB_PORT))
}

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
  const apiPort = resolveApiPort()
  const webPort = resolveWebPort()
  return {
    apiPort,
    apiBase: (process.env.API_BASE_URL || `http://localhost:${apiPort}`).replace(/\/$/, ''),
    siteUrl: (process.env.SITE_URL || `http://localhost:${webPort}`).replace(/\/$/, ''),
    sessionSecret: process.env.NUXT_SESSION_PASSWORD || process.env.SESSION_SECRET || process.env.JWT_SECRET,
    naverClientId: process.env.NAVER_CLIENT_ID,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET,
    naverCallbackUrl: process.env.NAVER_CALLBACK_URL,
    kakaoClientId: process.env.KAKAO_CLIENT_ID,
    kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET,
    kakaoCallbackUrl: process.env.KAKAO_CALLBACK_URL,
    uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.SITE_URL || `http://localhost:${webPort}`)
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
