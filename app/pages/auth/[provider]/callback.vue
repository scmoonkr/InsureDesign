<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main class="theme-auth-page">
      <section class="theme-auth-panel">
        <p class="theme-eyebrow">Account</p>
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
const provider = String(route.params.provider || '')
const title = ref('Signing you in.')
const message = ref('Please wait while we finish your login.')

const navItems = [
  { label: 'The Index', to: '/' },
  { label: 'The Errata', to: '/errata' },
  { label: 'Backend', to: '/backend' },
  { label: 'Admin', to: '/admin' },
]

onMounted(async () => {
  try {
    const query = new URLSearchParams()

    for (const [key, value] of Object.entries(route.query)) {
      if (Array.isArray(value)) {
        value.forEach((item) => item && query.append(key, item))
      } else if (value) {
        query.set(key, value)
      }
    }

    query.set('format', 'json')

    const result = await $fetch<{ ok: boolean, redirectUrl?: string }>(
      `${apiBase}/api/auth/${provider}/callback?${query.toString()}`,
      {
        credentials: 'include',
        headers: {
          accept: 'application/json',
        },
      },
    )

    if (result.ok) {
      await navigateTo('/')
      return
    }

    throw new Error('Login failed')
  } catch {
    title.value = 'Login failed.'
    message.value = 'Unable to complete social login. Please try again.'
  }
})
</script>

