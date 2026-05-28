import http from 'node:http'
import { URL } from 'node:url'
import { clearAuthSession, createOAuthState, getAuthSession, setAuthSession, verifyOAuthState } from './auth-session.mjs'
import { getConfig, loadEnv } from './config.mjs'
import { getUserById, listUsers, updateUserProfile, upsertSocialUser } from './auth-service.mjs'

loadEnv()

const AUTHORIZE_URLS = {
  naver: 'https://nid.naver.com/oauth2.0/authorize',
  kakao: 'https://kauth.kakao.com/oauth/authorize',
}

function getCallbackUrl(provider) {
  const config = getConfig()

  if (provider === 'naver' && config.naverCallbackUrl) {
    return config.naverCallbackUrl
  }

  if (provider === 'kakao' && config.kakaoCallbackUrl) {
    return config.kakaoCallbackUrl
  }

  return `${config.siteUrl}/auth/${provider}/callback`
}

function buildDob(birthyear, birthday) {
  if (!birthyear || !birthday) {
    return undefined
  }

  const dob = `${birthyear}-${birthday}`

  return /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : undefined
}

function normalizeGender(gender) {
  if (!gender) {
    return undefined
  }

  const value = String(gender).trim().toUpperCase()
  if (['M', 'F', 'U'].includes(value)) {
    return value
  }

  if (value === 'MALE') {
    return 'M'
  }

  if (value === 'FEMALE') {
    return 'F'
  }

  return undefined
}

function sendJson(req, res, statusCode, body) {
  applyCors(req, res)
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function sendRedirect(req, res, location) {
  applyCors(req, res)
  res.writeHead(302, { location })
  res.end()
}

function sendError(req, res, statusCode, message) {
  sendJson(req, res, statusCode, { error: message })
}

function applyCors(req, res) {
  const { siteUrl } = getConfig()
  const origin = req.headers.origin

  if (origin === siteUrl) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('access-control-allow-credentials', 'true')
    res.setHeader('vary', 'Origin')
  }

  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function validateProfileInput(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''
  const gender = typeof input.gender === 'string' ? input.gender.trim().toUpperCase() : ''
  const dob = typeof input.dob === 'string' ? input.dob.trim() : ''
  const avatarUrl = typeof input.avatarUrl === 'string' ? input.avatarUrl.trim() : ''
  const status = typeof input.status === 'string' ? input.status.trim() : ''

  if (!name || name.length > 80) {
    return { error: 'Name must be between 1 and 80 characters.' }
  }

  if (nickname.length > 80) {
    return { error: 'Nickname must be 80 characters or less.' }
  }

  if (gender && !['M', 'F', 'U'].includes(gender)) {
    return { error: 'Gender must be M, F, or U.' }
  }

  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return { error: 'DOB must use YYYY-MM-DD format.' }
  }

  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Avatar URL must start with http:// or https://.' }
      }
    } catch {
      return { error: 'Avatar URL is invalid.' }
    }
  }

  if (status && !['active', 'blocked', 'pending'].includes(status)) {
    return { error: 'Status must be active, blocked, or pending.' }
  }

  const value = {
    name,
    nickname,
    gender,
    dob,
    avatarUrl,
  }

  if (Object.hasOwn(input, 'status')) {
    value.status = status
  }

  return {
    value,
  }
}

async function handleGetMyProfile(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const user = await getUserById(session.id)
  if (!user) {
    clearAuthSession(res)
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleUpdateMyProfile(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)
  const validation = validateProfileInput(input)

  if (validation.error) {
    sendError(req, res, 400, validation.error)
    return
  }

  const user = await updateUserProfile(session.id, validation.value)
  if (!user) {
    clearAuthSession(res)
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  setAuthSession(res, {
    id: user.id,
    provider: user.provider,
    providerId: user.providerId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  })
  sendJson(req, res, 200, { user })
}

async function handleListBackendUsers(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const users = await listUsers({ limit: 200 })
  sendJson(req, res, 200, { users })
}

async function handleGetBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const user = await getUserById(userId)
  if (!user) {
    sendError(req, res, 404, 'User not found')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleUpdateBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)
  const validation = validateProfileInput(input)

  if (validation.error) {
    sendError(req, res, 400, validation.error)
    return
  }

  const user = await updateUserProfile(userId, validation.value)
  if (!user) {
    sendError(req, res, 404, 'User not found')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleAuthStart(req, res, provider) {
  if (!AUTHORIZE_URLS[provider]) {
    sendError(req, res, 404, 'Unknown auth provider')
    return
  }

  const config = getConfig()
  const clientId = provider === 'naver' ? config.naverClientId : config.kakaoClientId

  if (!clientId) {
    sendError(req, res, 500, `Missing ${provider} client id`)
    return
  }

  const redirectUri = getCallbackUrl(provider)
  const state = createOAuthState(res, provider)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: String(clientId),
    redirect_uri: redirectUri,
    state,
  })

  sendRedirect(req, res, `${AUTHORIZE_URLS[provider]}?${params.toString()}`)
}

async function handleAuthCallback(req, res, provider, url) {
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''

  if (!AUTHORIZE_URLS[provider]) {
    sendError(req, res, 404, 'Unknown auth provider')
    return
  }

  if (!code || !verifyOAuthState(req, res, provider, state)) {
    sendError(req, res, 400, 'Invalid OAuth state or code')
    return
  }

  const redirectUri = getCallbackUrl(provider)
  const token = await fetchAccessToken(provider, code, state, redirectUri)
  const profile = await fetchProfile(provider, token.access_token)
  const user = await upsertSocialUser(profile)

  setAuthSession(res, {
    id: String(user._id),
    provider: profile.provider,
    providerId: profile.providerId,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  })

  if (req.headers.accept?.includes('application/json') || url.searchParams.get('format') === 'json') {
    sendJson(req, res, 200, { ok: true, redirectUrl: `${getConfig().siteUrl}/` })
    return
  }

  sendRedirect(req, res, `${getConfig().siteUrl}/`)
}

async function fetchAccessToken(provider, code, state, redirectUri) {
  const config = getConfig()
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
  })

  if (provider === 'naver') {
    params.set('client_id', String(config.naverClientId || ''))
    params.set('client_secret', String(config.naverClientSecret || ''))
    params.set('state', state)
  } else {
    params.set('client_id', String(config.kakaoClientId || ''))
    params.set('redirect_uri', redirectUri)
    if (config.kakaoClientSecret) {
      params.set('client_secret', String(config.kakaoClientSecret))
    }
  }

  const response = await fetch(
    provider === 'naver'
      ? 'https://nid.naver.com/oauth2.0/token'
      : 'https://kauth.kakao.com/oauth/token',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: params,
    },
  )

  if (!response.ok) {
    throw new Error(`${provider} token request failed`)
  }

  return response.json()
}

async function fetchProfile(provider, accessToken) {
  if (provider === 'naver') {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error('Naver profile request failed')
    }

    const data = await response.json()

    return {
      provider,
      providerId: String(data.response.id),
      name: data.response.name || data.response.nickname || 'Naver User',
      nickname: data.response.nickname,
      email: data.response.email,
      avatarUrl: data.response.profile_image,
      gender: normalizeGender(data.response.gender),
      dob: buildDob(data.response.birthyear, data.response.birthday),
    }
  }

  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Kakao profile request failed')
  }

  const data = await response.json()

  return {
    provider,
    providerId: String(data.id),
    name:
      data.kakao_account?.profile?.nickname ||
      data.properties?.nickname ||
      'Kakao User',
    nickname:
      data.kakao_account?.profile?.nickname ||
      data.properties?.nickname,
    email: data.kakao_account?.email,
    avatarUrl:
      data.kakao_account?.profile?.thumbnail_image_url ||
      data.kakao_account?.profile?.profile_image_url ||
      data.properties?.profile_image,
    gender: normalizeGender(data.kakao_account?.gender),
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', getConfig().apiBase)

  if (req.method === 'OPTIONS') {
    applyCors(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      sendJson(req, res, 200, { user: getAuthSession(req) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      clearAuthSession(res)
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/users/me') {
      await handleGetMyProfile(req, res)
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/users/me') {
      await handleUpdateMyProfile(req, res)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/backend/users') {
      await handleListBackendUsers(req, res)
      return
    }

    const backendUserMatch = url.pathname.match(/^\/api\/backend\/users\/([^/]+)$/)
    if (req.method === 'GET' && backendUserMatch) {
      await handleGetBackendUser(req, res, backendUserMatch[1])
      return
    }

    if (req.method === 'PUT' && backendUserMatch) {
      await handleUpdateBackendUser(req, res, backendUserMatch[1])
      return
    }

    const authStartMatch = url.pathname.match(/^\/api\/auth\/(naver|kakao)$/)
    if (req.method === 'GET' && authStartMatch) {
      await handleAuthStart(req, res, authStartMatch[1])
      return
    }

    const authCallbackMatch = url.pathname.match(/^\/api\/auth\/(naver|kakao)\/callback$/)
    if (req.method === 'GET' && authCallbackMatch) {
      await handleAuthCallback(req, res, authCallbackMatch[1], url)
      return
    }

    sendError(req, res, 404, 'Not found')
  } catch (error) {
    console.error(error)
    sendError(req, res, 500, error instanceof Error ? error.message : 'Internal server error')
  }
}

const server = http.createServer(handleRequest)
const { apiPort } = getConfig()

server.listen(apiPort, () => {
  console.log(`CMS API server listening on http://localhost:${apiPort}`)
})
