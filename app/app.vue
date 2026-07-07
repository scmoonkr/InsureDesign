<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const config      = useSiteConfig()
const apiBase     = useApiBase()
const siteName    = useSiteName()
const siteDesc    = useSiteDescription()
const runtime     = useRuntimeConfig()

const siteUrl = computed(() => String(runtime.public.siteUrl || '').replace(/\/$/, ''))
const defaultOgImage = computed(() => (siteUrl.value ? `${siteUrl.value}/default_logo.png` : '/default_logo.png'))

useHead({
  // Home shows just the site name; inner pages become "Page Title | Site Name".
  title: () => siteName.value,
  titleTemplate: (t?: string) =>
    (!t || t === siteName.value) ? siteName.value : `${t} | ${siteName.value}`,
  meta: () => [
    ...(siteDesc.value ? [{ name: 'description', content: siteDesc.value }] : []),
    { property: 'og:site_name', content: siteName.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: siteName.value },
    ...(siteDesc.value ? [{ property: 'og:description', content: siteDesc.value }] : []),
    { property: 'og:image', content: defaultOgImage.value },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: () => {
    const raw = config.value.faviconUrl
    const href = raw
      ? (raw.startsWith('http') ? raw : `${apiBase}${raw}`)
      : '/favicon.ico'
    return [{ rel: 'icon', href }]
  },
})
</script>
