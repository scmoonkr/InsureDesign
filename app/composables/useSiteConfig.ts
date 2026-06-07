export type SiteConfig = {
  siteId:     string
  theme:      string
  siteName:   string
  logoUrl:    string
  faviconUrl: string
}

const DEFAULT: SiteConfig = {
  siteId: 'default', theme: 'default', siteName: '', logoUrl: '', faviconUrl: '',
}

export function useSiteConfig() {
  const apiBase = useApiBase()
  const { data } = useAsyncData<SiteConfig>(
    'site-config',
    () => $fetch<SiteConfig>(`${apiBase}/api/public/site-config`),
    { server: false, default: () => ({ ...DEFAULT }) },
  )
  return data as Ref<SiteConfig>
}
