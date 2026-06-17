import { getAuthSession } from './auth-session.mjs'
import { getUserById } from './auth-service.mjs'
import { getSiteByDomain } from './sites-service.mjs'
import { getConfig } from './config.mjs'

// Role hierarchy: member < manager < admin < super
// super is a system-only bypass for cross-site operators (sites CRUD, bootstrap).
// Only member/manager/admin are surfaced in the user role UI.
export const ROLE_LEVELS = { member: 1, manager: 2, admin: 3, super: 4 }
export const USER_ROLES = ['member', 'manager', 'admin']

// Check if user has minimum role for a given siteId.
// super role bypasses all siteId checks.
export function hasRole(roles = [], siteId, minRole = 'viewer') {
  const minLevel = ROLE_LEVELS[minRole] || 1
  return roles.some(r => {
    if (r.role === 'super') return true
    if (r.siteId !== siteId) return false
    return (ROLE_LEVELS[r.role] || 0) >= minLevel
  })
}

export function isSuperUser(roles = []) {
  return roles.some(r => r.role === 'super')
}

// Strip port from a host string: "insure.local:9001" → "insure.local"
function stripPort(host) {
  if (!host) return ''
  const i = host.lastIndexOf(':')
  if (i === -1) return host.toLowerCase()
  const maybePort = host.slice(i + 1)
  return /^\d+$/.test(maybePort) ? host.slice(0, i).toLowerCase() : host.toLowerCase()
}

// ── Public API ────────────────────────────────────────────────────────────────
// Resolve siteId from x-site-host header → origin hostname → DEFAULT_SITE_ID
export async function resolvePublicSiteId(req) {
  const siteHost = stripPort(req.headers['x-site-host'])
  if (siteHost) {
    const site = await getSiteByDomain(siteHost)
    if (site) return site.siteId
  }
  const origin = req.headers.origin
  if (origin) {
    try {
      const host = new URL(origin).hostname  // URL already strips port
      const site = await getSiteByDomain(host)
      if (site) return site.siteId
    } catch {}
  }
  return getConfig().defaultSiteId
}

// ── Admin API ─────────────────────────────────────────────────────────────────
// Extract siteId from x-admin-site header → ?siteId= query param → DEFAULT_SITE_ID
export function getAdminSiteId(req, url) {
  const header = req.headers['x-admin-site']
  if (header) return header.trim()
  const param = url?.searchParams?.get('siteId')
  if (param) return param.trim()
  return getConfig().defaultSiteId
}

// TEMP(dev): synthetic super-user used when AUTH_BYPASS=true so the backend is
// reachable without login. Remove the bypass branches once login is restored.
const BYPASS_SESSION = {
  id: '000000000000000000000000',
  provider: 'dev',
  providerId: 'dev-bypass',
  name: '개발자(임시)',
  email: 'dev@local',
  avatarUrl: '',
}
const BYPASS_USER = { _id: BYPASS_SESSION.id, status: 'active', roles: [{ role: 'super' }], ...BYPASS_SESSION }

// Session-only check. Returns { ok, session } or { ok: false, status, message }.
export function checkSession(req) {
  const session = getAuthSession(req)
  if (session) return { ok: true, session }
  if (getConfig().authBypass) return { ok: true, session: BYPASS_SESSION }
  return { ok: false, status: 401, message: 'Unauthorized' }
}

// Full admin check: session + active status + role for siteId.
// Returns { ok, session, user } or { ok: false, status, message }.
export async function checkAdmin(req, siteId, minRole = 'viewer') {
  const session = getAuthSession(req)

  // TEMP(dev): with AUTH_BYPASS on, allow access — use the real user if logged
  // in, otherwise fall back to a synthetic super-user.
  if (getConfig().authBypass) {
    if (session) {
      const u = await getUserById(session.id)
      if (u && u.status === 'active') return { ok: true, session, user: u }
    }
    return { ok: true, session: BYPASS_SESSION, user: BYPASS_USER }
  }

  if (!session) return { ok: false, status: 401, message: 'Unauthorized' }

  const user = await getUserById(session.id)
  if (!user || user.status !== 'active') {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  if (!hasRole(user.roles || [], siteId, minRole)) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true, session, user }
}
