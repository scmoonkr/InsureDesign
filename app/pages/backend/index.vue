<template>
  <div class="theme-backend">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <div class="theme-backend-shell">
      <aside class="theme-backend-menu">
        <div class="theme-backend-menu-title">Backend Menu</div>
        <nav class="theme-backend-nav">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.key"
            :class="{ current: item.key === 'pages' }"
            :to="item.to"
          >
            {{ item.label }}
            <span>{{ item.key }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Backend <span class="theme-em">Console.</span></h1>
          <span class="theme-meta">Full width · siteId scoped · policy controlled</span>
        </div>

        <section class="theme-backend-grid">
          <article v-for="item in menuItems" :key="item.key" class="theme-backend-card">
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

definePageMeta({
  layout: false,
})

const navItems = [
  { label: 'The Index', to: '/' },
  { label: 'The Errata', to: '/errata' },
  { label: 'Backend', to: '/backend', current: true },
  { label: 'Admin', to: '/admin' },
]

const menuItems = [
  {
    key: 'pages',
    label: 'Pages',
    to: '/backend',
    description: 'Template 기반 고정 페이지와 공개 경로를 관리합니다.',
  },
  {
    key: 'posts',
    label: 'Posts',
    to: '/backend',
    description: 'Markdown 원본과 허용된 block을 사용하는 게시글을 관리합니다.',
  },
  {
    key: 'categories',
    label: 'Categories',
    to: '/backend',
    description: 'siteId별 카테고리, slug, 정렬 순서를 관리합니다.',
  },
  {
    key: 'tags',
    label: 'Tags',
    to: '/backend',
    description: 'siteId별 태그와 사용량 기준 분류를 관리합니다.',
  },
  {
    key: 'images',
    label: 'Images',
    to: '/backend',
    description: '업로드 이미지, variant, usedIn 참조를 관리합니다.',
  },
  {
    key: 'users',
    label: 'Users',
    to: '/backend/users',
    description: '사용자 계정과 siteId 기준 role 권한을 관리합니다.',
  },
]
</script>
