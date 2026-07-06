// Returns the appropriate API base URL for the current execution context.
//
// All pages build API URLs as:  `${apiBase}/api/public/...`
// So apiBase must be the SERVER ORIGIN only — never a path prefix like "/api".
//
// SSR (server-side render): uses the PRIVATE apiInternalBase so the Node.js
//   process can call the API server directly on localhost without going through
//   Apache.  Set API_INTERNAL_BASE=http://localhost:9010 in your .env.
//   → returns "http://localhost:9010"
//
// Browser (client-side navigation): uses the PUBLIC apiBase.
//   Production: leave NUXT_PUBLIC_API_BASE unset (or set to "").
//     → returns "" (empty string), so URLs become "/api/public/..." (same-origin)
//     → Apache ProxyPass /api/ → localhost:9010/api/ handles the routing.
//   Development: set NUXT_PUBLIC_API_BASE=http://localhost:9010
//     → returns "http://localhost:9010" (developer's browser can reach it directly)
//
// IMPORTANT: do NOT set NUXT_PUBLIC_API_BASE=/api in production.
//   That would produce double-prefix URLs like /api/api/public/...
export function useApiBase(): string {
  const config = useRuntimeConfig()
  if (import.meta.server) {
    const internal = (config.apiInternalBase as string | undefined || '').replace(/\/$/, '')
    return internal || `http://localhost:${config.apiPort}`
  }
  // Use ?? (not ||) so that an explicitly empty NUXT_PUBLIC_API_BASE stays empty.
  return String(config.public.apiBase ?? '').replace(/\/$/, '')
}
