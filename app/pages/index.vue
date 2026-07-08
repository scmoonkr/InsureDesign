<template>
  <!-- '/' 는 slug='home' 페이지를 [contentType]/[slug] 와 100% 동일하게 렌더.
       'home' 페이지가 없으면 #fallback (테마 기본 인덱스)로 대체. -->
  <PublicContentView content-type="page" :slug="HOME_SLUG" fallback-on-missing>
    <template #fallback>
      <component :is="theme.components.indexPage" />
    </template>
  </PublicContentView>
</template>

<script setup lang="ts">
import PublicContentView from '~/components/public/PublicContentView.vue'

definePageMeta({ layout: 'default' })

// '/' 에 띄울 페이지 slug. 이 slug 페이지를 backend 에서 발행하면 홈이 됨.
const HOME_SLUG = 'home'
const { theme } = useSiteTheme()
</script>
