<template>
  <component :is="theme.components.errataPage" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { theme } = useSiteTheme()
</script>
