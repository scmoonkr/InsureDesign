type Site = {
  id: string
  siteId: string
  name: string
  status: string
  domains: Array<{ host: string; isPrimary: boolean; status: string }>
}

export function useSiteAdmin() {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

  const activeSiteId = useState<string>('adminSiteId', () => '')

  const { data: sitesData } = useFetch<{ sites: Site[]; isSuper?: boolean }>(
    `${apiBase}/api/admin/sites`,
    {
      key: 'admin-sites',
      credentials: 'include',
      server: false,
      default: () => ({ sites: [], isSuper: false }),
    },
  )

  const sites = computed(() => sitesData.value?.sites ?? [])
  const isSuper = computed(() => sitesData.value?.isSuper ?? false)

  // Auto-select first site when list loads and nothing is selected
  watch(sites, (list) => {
    if (list.length && !activeSiteId.value) {
      activeSiteId.value = list[0].siteId
    }
  }, { immediate: true })

  const activeSite = computed(
    () => sites.value.find(s => s.siteId === activeSiteId.value) ?? sites.value[0] ?? null,
  )

  function selectSite(siteId: string) {
    activeSiteId.value = siteId
  }

  // Returns headers object for admin $fetch calls
  function adminHeaders(): Record<string, string> {
    const id = activeSiteId.value || sites.value[0]?.siteId || ''
    return id ? { 'x-admin-site': id } : {}
  }

  return { activeSiteId, activeSite, sites, isSuper, selectSite, adminHeaders }
}
