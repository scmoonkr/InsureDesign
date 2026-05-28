<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main class="theme-auth-page">
      <section class="theme-auth-panel">
        <p class="theme-eyebrow">Account</p>
        <h1>My Page</h1>
        <p>Personal account overview will be connected here.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

definePageMeta({
  layout: false,
})

const navItems = [
  { label: 'The Index', to: '/' },
  { label: 'The Errata', to: '/errata' },
  { label: 'Backend', to: '/backend' },
  { label: 'Admin', to: '/admin' },
]
</script>
