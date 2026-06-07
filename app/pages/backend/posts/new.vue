<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="New Post."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="posts" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>New Post.</h1>
          <NuxtLink to="/backend/posts" class="theme-backend-link">← 목록</NuxtLink>
        </div>

        <ContentEditor
          content-type="post"
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
  // Navigate to the edit page for the newly-created post.
  router.replace(`/backend/posts/${id}`)
}

function onCancel() {
  router.push('/backend/posts')
}
</script>
