<template>
  <component :is="theme.components.indexPage" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { theme } = useSiteTheme()
</script>
