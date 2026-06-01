<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Posts."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="posts" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>Posts.</h1>
            <div class="theme-backend-contents-filters">
              <select v-model="statusFilter" name="statusFilter">
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="deleted">Deleted (휴지통)</option>
              </select>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ total }} posts</span>
            <NuxtLink to="/backend/posts/new" class="theme-form-submit">+ New Post</NuxtLink>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading posts...</div>
        <div v-else-if="!items.length" class="theme-backend-state">등록된 글이 없습니다.</div>

        <section v-else class="theme-backend-contents-list">
          <NuxtLink
            v-for="item in items"
            :key="item.id"
            :to="`/backend/posts/${item.id}`"
            class="theme-backend-content-row"
          >
            <div class="theme-backend-content-info">
              <span class="theme-backend-content-title">
                {{ item.title }}
                <span v-if="item.meta?.featured" class="theme-backend-badge badge-type-post" style="font-size:10px;margin-left:6px">★ Featured</span>
              </span>
              <code class="theme-backend-content-slug">{{ item.slug }}</code>
            </div>
            <div class="theme-backend-content-meta">
              <span :class="['theme-backend-badge', `badge-status-${item.status}`]">{{ item.status }}</span>
              <span class="theme-meta">{{ formatDate(item.updatedAt) }}</span>
            </div>
          </NuxtLink>
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

type PostListItem = {
  id: string
  title: string
  slug: string
  status: string
  updatedAt: string
  meta?: { featured?: boolean }
}

const LIMIT = 20

const { navItems } = useBackendMenu()
const { activeSiteId } = useSiteAdmin()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const statusFilter = ref('')
const skip = ref(0)

const listUrl = computed(() => {
  const p = new URLSearchParams()
  p.set('siteId', activeSiteId.value || '')
  p.set('type', 'post')
  p.set('limit', String(LIMIT))
  p.set('skip', String(skip.value))
  if (statusFilter.value) p.set('status', statusFilter.value)
  return `${apiBase}/api/admin/contents?${p}`
})

const { data, pending } = useFetch<{ items: PostListItem[]; total: number }>(
  listUrl,
  {
    key: 'admin-posts-list',
    credentials: 'include',
    server: false,
    watch: [statusFilter, activeSiteId, skip],
    default: () => ({ items: [], total: 0 }),
  },
)

const items = computed<PostListItem[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

watch([statusFilter, activeSiteId], () => { skip.value = 0 })

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
