<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const config   = useSiteConfig()
const apiBase  = useApiBase()
const siteName = useSiteName()

useHead({
  title: () => siteName.value,
  link:  () => {
    const raw = config.value.faviconUrl
    const href = raw
      ? (raw.startsWith('http') ? raw : `${apiBase}${raw}`)
      : '/favicon.ico'
    return [{ rel: 'icon', href }]
  },
})
</script>
