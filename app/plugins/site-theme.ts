export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const themeName = useState<string>('siteTheme', () => 'default')

  if (import.meta.server) {
    try {
      const internal = (config.apiInternalBase as string | undefined || '').replace(/\/$/, '')
      const apiBase = internal || `http://localhost:${config.apiPort || 9000}`
      const data = await $fetch<{ theme: string }>(
        `${apiBase}/api/public/site-config`,
      )
      if (data?.theme) themeName.value = data.theme
    } catch {
      // keep default
    }
  }
})
