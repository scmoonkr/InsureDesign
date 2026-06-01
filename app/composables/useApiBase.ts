// Returns the appropriate API base URL for the current execution context.
//
// SSR (server-side render): uses the PRIVATE apiInternalBase so the Node.js
//   process can call the API server directly on localhost without going through
//   Apache.  Set API_INTERNAL_BASE=http://localhost:9000 in your .env.
//
// Browser (client-side navigation): uses the PUBLIC apiBase.  In production
//   this should be the relative path "/api" so the browser's request goes to
//   the same origin and Apache proxies it to the API server.
//   Set NUXT_PUBLIC_API_BASE=/api in your production .env.
//
// Development: leave both at their defaults (http://localhost:9000).  The
//   developer's browser can directly reach localhost:9000, so the relative-URL
//   split is not needed.
export function useApiBase(): string {
  const config = useRuntimeConfig()
  if (import.meta.server) {
    const internal = (config.apiInternalBase as string | undefined || '').replace(/\/$/, '')
    return internal || `http://localhost:${config.apiPort || 9000}`
  }
  return String(config.public.apiBase || '/api').replace(/\/$/, '')
}
