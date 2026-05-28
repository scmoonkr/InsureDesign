<template>
  <section class="theme-hero">
    <div class="theme-eyebrow">{{ eyebrow }}</div>
    <div v-if="corner" class="theme-corner">{{ corner }}</div>

    <h1>
      {{ title }}
      <span class="theme-em">{{ emphasis }}</span>
    </h1>
    <p class="theme-lede">{{ lede }}</p>

    <div class="theme-foot">
      <span>{{ footLeft }}</span>
      <span>{{ footCenter }}</span>
      <span>{{ footRight }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  corner?: string
  title: string
  emphasis: string
  lede: string
  footLeft: string
  footCenter: string
  footRight: string
}>()
</script>
