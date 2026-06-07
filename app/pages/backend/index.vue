<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Backend Console."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="sites" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Backend Console.</h1>
          <span class="theme-meta">Full width · siteId scoped · policy controlled</span>
        </div>

        <section class="theme-backend-grid">
          <article v-for="item in cardItems" :key="item.key" class="theme-backend-card">
            <h2>{{ item.label }}</h2>
            <p>{{ item.description }}</p>
          </article>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({
  layout: 'default',
})

const { navItems } = useBackendMenu()

const cardItems = [
  { key: 'pages', label: 'Pages', description: 'Template 기반 고정 페이지와 계층 구조를 관리합니다.' },
  { key: 'posts', label: 'Posts', description: 'Markdown 본문과 block을 사용하는 게시글을 관리합니다.' },
  { key: 'categories', label: 'Categories', description: 'siteId별 카테고리, slug, 계층 구조를 관리합니다.' },
  { key: 'tags', label: 'Tags', description: 'siteId별 태그와 사용 빈도 기반 정렬을 관리합니다.' },
  { key: 'media', label: 'Media', description: '업로드된 이미지, variant, usedIn 참조를 관리합니다.' },
  { key: 'users', label: 'Users', description: '사용자 계정과 siteId 기반 role 권한을 관리합니다.' },
  { key: 'theme', label: 'Theme', description: '사이트 전체에 적용되는 활성 테마를 변경합니다.' },
  { key: 'foundation', label: 'Foundation', description: '버튼, 색상, 간격 등 디자인 기초 요소를 확인합니다.' },
]

const isSidebarOpen = ref(false)
</script>
