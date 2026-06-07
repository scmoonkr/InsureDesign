<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const config  = useSiteConfig()
const apiBase = useApiBase()

useHead({
  title: () => config.value.siteName || 'CMS',
  link:  () => {
    const raw = config.value.faviconUrl
    if (!raw) return []
    const href = raw.startsWith('http') ? raw : `${apiBase}${raw}`
    return [{ rel: 'icon', href }]
  },
})
</script>
