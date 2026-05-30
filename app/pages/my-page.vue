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
  layout: 'default',
})

const navItems = useSiteNav('header')
</script>
