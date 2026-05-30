<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Foundation."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="foundation" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <header class="theme-foundation-head">
          <p class="theme-foundation-kicker">MVP / color-default.md</p>
          <h1>Black & White UI Foundation</h1>
          <p>button, label, border, background-color의 실제 톤과 대비를 한 화면에서 비교합니다.</p>
        </header>
        <ThemeFoundationPreview />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import ThemeFoundationPreview from '~/components/admin/ThemeFoundationPreview.vue'

definePageMeta({
  layout: 'default',
})

const { navItems } = useBackendMenu()

const isSidebarOpen = ref(false)
</script>



