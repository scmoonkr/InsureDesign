// Gate /backend/* to users with manager+ role.
// Members without manager+ are bounced to / with an alert.
//
// Runs on the client only — SSR is allowed to render the page shell so direct
// link visits don't 404 mid-stream; the redirect happens right after hydration.

const ROLE_LEVELS: Record<string, number> = { member: 1, manager: 2, admin: 3, super: 4 }
const MIN_BACKEND_LEVEL = ROLE_LEVELS.manager

type Role = { role: string }
type MeUser = { id: string; roles?: Role[] } | null

function hasBackendAccess(user: MeUser): boolean {
  if (!user) return false
  return (user.roles || []).some(r => {
    if (r.role === 'super') return true
    return (ROLE_LEVELS[r.role] || 0) >= MIN_BACKEND_LEVEL
  })
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/backend')) return
  if (import.meta.server) return

  const apiBase = useApiBase()

  let user: MeUser = null
  try {
    const res = await $fetch<{ user: MeUser }>(`${apiBase}/api/auth/me`, {
      credentials: 'include',
    })
    user = res.user
  } catch {
    // Network/server error → treat as unauthorized
    user = null
  }

  if (hasBackendAccess(user)) return

  if (!user) {
    alert('로그인이 필요합니다.')
  } else {
    alert('권한이 없습니다. 관리자 페이지는 manager 이상만 접근할 수 있습니다.')
  }
  return navigateTo('/')
})
