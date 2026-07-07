import { getAuthSession } from './auth-session.mjs'
import { getUserById } from './auth-service.mjs'
import { getConfig } from './config.mjs'

// Role hierarchy: member < employee < manager < admin < super
// super is a system-only bypass role kept for bootstrap/system operations.
// Only member/employee/manager/admin are surfaced in the user role UI.
// Backend (/backend/*) access is manager+, so employee is a content-viewing tier
// (can see employee-gated pages/posts) without management access.
export const ROLE_LEVELS = { member: 1, employee: 2, manager: 3, admin: 4, super: 5 }
export const USER_ROLES = ['member', 'employee', 'manager', 'admin']

// Check if user meets the minimum role. super role bypasses all checks.
export function hasRole(roles = [], minRole = 'viewer') {
  const minLevel = ROLE_LEVELS[minRole] || 1
  return roles.some(r => {
    if (r.role === 'super') return true
    return (ROLE_LEVELS[r.role] || 0) >= minLevel
  })
}

export function isSuperUser(roles = []) {
  return roles.some(r => r.role === 'super')
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

// Full admin check: session + active status + role.
// Returns { ok, session, user } or { ok: false, status, message }.
export async function checkAdmin(req, minRole = 'viewer') {
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

  if (!hasRole(user.roles || [], minRole)) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true, session, user }
}
