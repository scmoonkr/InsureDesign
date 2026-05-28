<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Contents."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="contents" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>Contents.</h1>
            <div class="theme-backend-contents-filters">
              <select v-model="typeFilter" name="typeFilter">
                <option value="">All types</option>
                <option value="post">Post</option>
                <option value="page">Page</option>
                <option value="notice">Notice</option>
                <option value="gallery">Gallery</option>
              </select>
              <select v-model="statusFilter" name="statusFilter">
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ total }} items</span>
            <NuxtLink class="theme-form-submit" to="/backend/contents/new">+ New</NuxtLink>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading contents...</div>
        <div v-else-if="!items.length" class="theme-backend-state">
          No contents yet.
          <NuxtLink to="/backend/contents/new" class="theme-backend-link">Create the first one →</NuxtLink>
        </div>

        <section v-else class="theme-backend-contents-list">
          <article v-for="item in items" :key="item.id" class="theme-backend-content-row">
            <div class="theme-backend-content-info">
              <NuxtLink :to="`/backend/contents/${item.id}`" class="theme-backend-content-title">
                {{ item.title }}
              </NuxtLink>
              <code class="theme-backend-content-slug">{{ item.slug }}</code>
            </div>
            <div class="theme-backend-content-meta">
              <span :class="['theme-backend-badge', `badge-type-${item.contentType}`]">
                {{ item.contentType }}
              </span>
              <span :class="['theme-backend-badge', `badge-status-${item.status}`]">
                {{ item.status }}
              </span>
              <span class="theme-meta">{{ formatDate(item.updatedAt) }}</span>
            </div>
            <div class="theme-backend-content-actions">
              <NuxtLink :to="`/backend/contents/${item.id}`" class="theme-backend-link">Edit</NuxtLink>
              <button
                type="button"
                class="theme-backend-link theme-backend-link-danger"
                @click="confirmDelete(item)"
              >
                Delete
              </button>
            </div>
          </article>
        </section>

        <div v-if="total > LIMIT" class="theme-backend-pagination">
          <button type="button" :disabled="skip === 0" @click="skip = Math.max(0, skip - LIMIT)">←</button>
          <span>{{ Math.floor(skip / LIMIT) + 1 }} / {{ Math.ceil(total / LIMIT) }}</span>
          <button type="button" :disabled="skip + LIMIT >= total" @click="skip += LIMIT">→</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({ layout: 'default' })

type ContentItem = {
  id: string
  siteId: string
  contentType: string
  title: string
  slug: string
  status: string
  visibility: string
  updatedAt: string
}

const LIMIT = 20

const { navItems } = useBackendMenu()
const { activeSiteId } = useSiteAdmin()
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

const isSidebarOpen = ref(false)
const typeFilter = ref('')
const statusFilter = ref('')
const skip = ref(0)

// Reactive URL — refetches automatically when any dep changes
const fetchUrl = computed(() => {
  const p = new URLSearchParams()
  p.set('siteId', activeSiteId.value || '')
  p.set('limit', String(LIMIT))
  p.set('skip', String(skip.value))
  if (typeFilter.value) p.set('type', typeFilter.value)
  if (statusFilter.value) p.set('status', statusFilter.value)
  return `${apiBase}/api/admin/contents?${p}`
})

const { data, pending, refresh } = useFetch<{ items: ContentItem[]; total: number }>(
  fetchUrl,
  {
    credentials: 'include',
    server: false,
    default: () => ({ items: [], total: 0 }),
  },
)

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

// Reset page when filters change
watch([typeFilter, statusFilter, activeSiteId], () => { skip.value = 0 })

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function confirmDelete(item: ContentItem) {
  if (!confirm(`"${item.title}" 를 삭제하시겠습니까?`)) return
  try {
    await $fetch(`${apiBase}/api/admin/contents/${item.id}?siteId=${item.siteId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    refresh()
  } catch {
    alert('삭제에 실패했습니다.')
  }
}
</script>
