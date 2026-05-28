import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'

const SESSION_COOKIE = 'cms_session'
const STATE_COOKIE_PREFIX = 'cms_oauth_state_'

export type AuthSessionUser = {
  id: string
  provider: string
  providerId: string
  name: string
  email?: string
  avatarUrl?: string
}

function getSecret() {
  const secret = process.env.NUXT_SESSION_PASSWORD || process.env.SESSION_SECRET || process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('Missing SESSION_SECRET or NUXT_SESSION_PASSWORD with at least 16 characters')
  }

  return secret
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

export function createOAuthState(event: H3Event, provider: string) {
  const state = crypto.randomBytes(24).toString('base64url')

  setCookie(event, `${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 10,
  })

  return state
}

export function verifyOAuthState(event: H3Event, provider: string, state?: string) {
  const cookieName = `${STATE_COOKIE_PREFIX}${provider}`
  const savedState = getCookie(event, cookieName)

  deleteCookie(event, cookieName, { path: '/' })

  if (!state || !savedState) return false

  const stateBuffer = Buffer.from(state)
  const savedStateBuffer = Buffer.from(savedState)

  if (stateBuffer.length !== savedStateBuffer.length) return false

  return crypto.timingSafeEqual(stateBuffer, savedStateBuffer)
}

export function setAuthSession(event: H3Event, user: AuthSessionUser) {
  const payload = encodeBase64Url(JSON.stringify(user))
  const signature = sign(payload)

  setCookie(event, SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
}

export function getAuthSession(event: H3Event): AuthSessionUser | null {
  const cookie = getCookie(event, SESSION_COOKIE)
  if (!cookie) return null

  const [payload, signature] = cookie.split('.')
  if (!payload || !signature || sign(payload) !== signature) return null

  try {
    return JSON.parse(decodeBase64Url(payload)) as AuthSessionUser
  } catch {
    return null
  }
}

export function clearAuthSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
