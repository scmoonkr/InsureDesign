<template>
  <PublicContentView :content-type="contentType" :slug="slug" />
</template>

<script setup lang="ts">
import PublicContentView from '~/components/public/PublicContentView.vue'

definePageMeta({
  layout: 'default',
  validate(route) {
    return ['post', 'page', 'notice', 'gallery'].includes(String(route.params.contentType))
  },
})

const route = useRoute()
const contentType = computed(() => String(route.params.contentType || ''))
const slug = computed(() => String(route.params.slug || ''))
</script>
