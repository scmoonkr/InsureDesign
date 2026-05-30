<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="New Page."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="pages" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>New Page.</h1>
          <NuxtLink to="/backend/pages" class="theme-backend-link">← 목록</NuxtLink>
        </div>

        <ContentEditor
          content-type="page"
          mode="admin"
          @saved="onSaved"
          @cancel="onCancel"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import ContentEditor from '~/components/admin/ContentEditor.vue'

definePageMeta({ layout: 'default' })

const { navItems } = useBackendMenu()
const router = useRouter()
const isSidebarOpen = ref(false)

function onSaved(id: string) {
  router.replace(`/backend/pages/${id}`)
}

function onCancel() {
  router.push('/backend/pages')
}
</script>
