<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Edit Post."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="posts" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Edit Post.</h1>
          <NuxtLink to="/backend/posts" class="theme-backend-link">← 목록</NuxtLink>
        </div>

        <ContentEditor
          content-type="post"
          mode="admin"
          :id="id"
          @saved="onSaved"
          @deleted="onDeleted"
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
const route = useRoute()
const router = useRouter()
const isSidebarOpen = ref(false)

const id = computed(() => String(route.params.id || ''))

function onSaved(_id: string) {
  // No navigation — stay on edit page. ContentEditor shows the saved message.
}

function onDeleted() {
  router.push('/backend/posts')
}

function onCancel() {
  router.push('/backend/posts')
}
</script>
