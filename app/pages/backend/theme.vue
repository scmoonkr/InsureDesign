<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Theme."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="theme" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Theme.</h1>
          <span class="theme-meta">{{ Object.keys(themeList).length }} available</span>
        </div>

        <p v-if="message" :class="['theme-form-status', { error: isError }]" style="margin: 0 0 20px;">
          {{ message }}
        </p>

        <section class="theme-backend-theme-grid">
          <article
            v-for="(def, key) in themeList"
            :key="key"
            :class="['theme-backend-theme-card', { active: key === activeThemeName }]"
            role="button"
            tabindex="0"
            @click="openPreview(String(key))"
            @keydown.enter.prevent="openPreview(String(key))"
            @keydown.space.prevent="openPreview(String(key))"
          >
            <div class="theme-backend-theme-info">
              <strong>{{ def.label }}</strong>
              <code class="theme-backend-theme-name">{{ key }}</code>
              <p>{{ def.description }}</p>
            </div>
            <div class="theme-backend-theme-footer" @click.stop>
              <span v-if="key === activeThemeName" class="theme-backend-theme-badge">Active</span>
              <button
                v-else
                type="button"
                class="theme-form-submit"
                :disabled="isActivating"
                @click="activateTheme(String(key))"
              >
                Activate
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>

    <div v-if="previewKey" class="theme-backend-user-modal" @click="closePreview">
      <aside class="theme-backend-user-drawer theme-backend-theme-drawer" @click.stop>
        <header class="theme-backend-user-drawer-head">
          <div>
            <strong>{{ themeList[previewKey]?.label }} Foundation</strong>
            <code class="theme-backend-theme-name">{{ previewKey }}</code>
          </div>
          <button type="button" class="theme-backend-close" aria-label="Close preview" @click="closePreview">×</button>
        </header>
        <ThemeFoundationPreview />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import ThemeFoundationPreview from '~/components/admin/ThemeFoundationPreview.vue'
import { themes } from '~/themes'

definePageMeta({
  layout: 'default',
})

const { navItems } = useBackendMenu()
const { themeName } = useSiteTheme()
const apiBase = useApiBase()

const themeList = themes
const activeThemeName = computed(() => themeName.value)
const isActivating = ref(false)
const message = ref('')
const isError = ref(false)
const isSidebarOpen = ref(false)
const previewKey = ref<string>('')

function openPreview(key: string) {
  previewKey.value = key
}

function closePreview() {
  previewKey.value = ''
}

async function activateTheme(name: string) {
  isActivating.value = true
  message.value = ''
  isError.value = false
  try {
    await $fetch(`${apiBase}/api/admin/settings/theme`, {
      method: 'PUT',
      credentials: 'include',
      body: { theme: name },
    })
    themeName.value = name
    message.value = `"${themes[name]?.label}" 테마가 적용되었습니다.`
  } catch {
    isError.value = true
    message.value = '테마 변경에 실패했습니다.'
  } finally {
    isActivating.value = false
  }
}
</script>
