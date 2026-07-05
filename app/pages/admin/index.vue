<template>
  <section class="page-stack">
    <div class="section-heading">
      <p class="eyebrow">Admin</p>
      <h1>관리자 작업 영역</h1>
      <p>콘텐츠, 이미지, 메뉴, 사이트 설정을 정책 범위 안에서 관리하는 화면입니다.</p>
    </div>

    <div class="admin-list">
      <NuxtLink v-for="item in adminItems" :key="item.path" class="admin-row" :to="item.path">
        <span>{{ item.label }}</span>
        <small>{{ item.description }}</small>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const adminItems = [
  { label: 'Contents', path: '/admin/contents', description: 'Markdown 기반 콘텐츠 관리' },
  { label: 'Images', path: '/admin/images', description: '이미지 관리' },
  { label: 'Menus', path: '/admin/menus', description: 'header/footer 메뉴 관리' },
  { label: 'Settings', path: '/admin/settings', description: '사이트 정책 및 설정 관리' },
]
</script>
