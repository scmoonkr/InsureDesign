<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="GAK휴먼선운" :items="navItems" />

    <main class="public-content-shell">
      <article class="public-content is-page">
        test
      </article>
    </main>

    <DefaultThemeFooter :columns="footerColumns" imprint="© 2026 GAK휴먼선운" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import InsureLocationBlock from '~/components/blocks/insurance/InsureLocationBlock.vue'

definePageMeta({ layout: 'default' })

const navItems = useSiteNav('header')
const footerColumns = useSiteFooterColumns()

const block = {
  type: 'insureLocation',
  props: {
    title: '위치 및 연락처',
    subtitle: '지에이코리아 휴먼선운사업부 | 오시는 길을 | 안내해 드립니다.',
    address: '( 22140) 주안중로 25 (주안동 169, 신성쇼핑 708호)',
    phone: '032-424-7726',
    fax: '032-429-4004',
    directions: '경인1호선 주안역 1번출구 도보 430m | 인천2호선 시민공원(문화창작지대)역 1번출구 770m',
    mapImageId: '',
  },
}

const mediaMap = {}
</script>

<style scoped>
.public-content-shell {
  padding: 40px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

.public-content {
  max-width: 880px;
  margin: 0 auto;
}
</style>
