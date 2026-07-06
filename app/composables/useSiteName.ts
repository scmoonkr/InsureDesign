// Resolved site name, in priority order:
//   1. DB `settings.siteName` (from /api/public/site-config)
//   2. `.env` SITE_NAME (exposed via runtimeConfig.public.siteName)
//   3. hard fallback 'InsureDesign'
//
// Use this instead of hard-coding a site name anywhere in the UI.
export function useSiteName(): ComputedRef<string> {
  const config = useSiteConfig()
  const runtime = useRuntimeConfig()
  return computed(
    () => config.value.siteName || (runtime.public.siteName as string) || 'InsureDesign',
  )
}
