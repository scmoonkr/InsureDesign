export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const themeName = useState<string>('siteTheme', () => 'default')

  if (import.meta.server) {
    try {
      const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
      const { host } = useRequestHeaders(['host'])
      const data = await $fetch<{ theme: string; siteId: string }>(
        `${apiBase}/api/public/site-config`,
        { headers: host ? { 'x-site-host': host } : {} },
      )
      if (data?.theme) themeName.value = data.theme
    } catch {
      // keep default
    }
  }
})
