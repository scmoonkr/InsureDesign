// Default site description (SEO), from `.env` SITE_DESCRIPTION via
// runtimeConfig.public.siteDescription. Used as the fallback meta description
// when a page/post has no excerpt.
export function useSiteDescription(): ComputedRef<string> {
  const runtime = useRuntimeConfig()
  return computed(() => String(runtime.public.siteDescription || ''))
}
