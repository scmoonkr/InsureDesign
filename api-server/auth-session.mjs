import crypto from 'node:crypto'
import { getConfig } from './config.mjs'

const SESSION_COOKIE = 'cms_session'
const STATE_COOKIE_PREFIX = 'cms_oauth_state_'

function getSecret() {
  const secret = getConfig().sessionSecret
  if (!secret || secret.length < 16) {
    throw new Error('Missing SESSION_SECRET or NUXT_SESSION_PASSWORD with at least 16 characters')
  }

  return secret
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`]

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.secure) parts.push('Secure')

  return parts.join('; ')
}

export function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName) {
      continue
    }

    cookies[rawName] = rawValue.join('=')
  }

  return cookies
}

export function createOAuthState(res, provider) {
  const state = crypto.randomBytes(24).toString('base64url')
  appendCookie(
    res,
    serializeCookie(`${STATE_COOKIE_PREFIX}${provider}`, state, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 10,
    }),
  )

  return state
}

export function verifyOAuthState(req, res, provider, state) {
  const cookieName = `${STATE_COOKIE_PREFIX}${provider}`
  const savedState = parseCookies(req)[cookieName]

  appendCookie(res, serializeCookie(cookieName, '', { path: '/', maxAge: 0 }))

  if (!state || !savedState) {
    return false
  }

  const stateBuffer = Buffer.from(state)
  const savedStateBuffer = Buffer.from(savedState)

  if (stateBuffer.length !== savedStateBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(stateBuffer, savedStateBuffer)
}

export function setAuthSession(res, user) {
  const payload = encodeBase64Url(JSON.stringify(user))
  const signature = sign(payload)

  appendCookie(
    res,
    serializeCookie(SESSION_COOKIE, `${payload}.${signature}`, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    }),
  )
}

export function getAuthSession(req) {
  const cookie = parseCookies(req)[SESSION_COOKIE]
  if (!cookie) {
    return null
  }

  const [payload, signature] = cookie.split('.')
  if (!payload || !signature || sign(payload) !== signature) {
    return null
  }

  try {
    return JSON.parse(decodeBase64Url(payload))
  } catch {
    return null
  }
}

export function clearAuthSession(res) {
  appendCookie(res, serializeCookie(SESSION_COOKIE, '', { path: '/', maxAge: 0 }))
}

function appendCookie(res, cookie) {
  const current = res.getHeader('Set-Cookie')

  if (!current) {
    res.setHeader('Set-Cookie', cookie)
    return
  }

  res.setHeader('Set-Cookie', Array.isArray(current) ? [...current, cookie] : [current, cookie])
}
