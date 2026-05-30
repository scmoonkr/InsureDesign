<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main class="theme-auth-page">
      <section class="theme-auth-panel">
        <p class="theme-eyebrow">Account</p>
        <h1>My Page</h1>
        <p>본인이 작성한 글을 여기서 확인하고 수정할 수 있습니다.</p>
      </section>

      <section class="my-page-section">
        <div class="my-page-section-head">
          <h2>내가 쓴 글</h2>
          <NuxtLink to="/my-page/edit/post/new" class="theme-form-submit">+ 새 글 작성</NuxtLink>
        </div>

        <div v-if="pending" class="my-page-state">불러오는 중...</div>
        <div v-else-if="error" class="my-page-state error">
          {{ errorMessage }}
        </div>
        <div v-else-if="!items.length" class="my-page-state">아직 작성한 글이 없습니다.</div>

        <ul v-else class="my-page-list">
          <li v-for="item in items" :key="item.id" class="my-page-list-item">
            <NuxtLink :to="`/my-page/edit/post/${item.id}`" class="my-page-list-link">
              <div class="my-page-list-main">
                <strong class="my-page-list-title">{{ item.title }}</strong>
                <code class="my-page-list-slug">{{ item.slug }}</code>
              </div>
              <div class="my-page-list-meta">
                <span :class="['theme-backend-badge', `badge-status-${item.status}`]">{{ item.status }}</span>
                <span class="theme-meta">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

definePageMeta({ layout: 'default' })

type OwnPost = {
  id: string
  title: string
  slug: string
  status: string
  updatedAt: string
}

const navItems = useSiteNav('header')
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

const { data, pending, error } = useFetch<{ items: OwnPost[]; total: number }>(
  `${apiBase}/api/me/contents?type=post&limit=50`,
  {
    key: 'my-page-own-posts',
    credentials: 'include',
    server: false,
    default: () => ({ items: [], total: 0 }),
  },
)

const items = computed<OwnPost[]>(() => data.value?.items ?? [])

const errorMessage = computed(() => {
  const e = error.value as { statusCode?: number; data?: { error?: string }; message?: string } | null
  if (!e) return ''
  if (e.statusCode === 401) return '로그인이 필요합니다.'
  return e.data?.error || e.message || '글 목록을 불러오지 못했습니다.'
})

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.my-page-section {
  max-width: 880px;
  margin: 32px auto 0;
  padding: 0 24px;
}
.my-page-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.my-page-section-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.my-page-state {
  padding: 24px;
  text-align: center;
  color: var(--theme-fg-dim);
  border: 1px dashed var(--theme-line);
}
.my-page-state.error {
  color: var(--theme-fg);
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.3);
}
.my-page-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--theme-line);
  border-radius: 6px;
  overflow: hidden;
  background: var(--theme-bg);
}
.my-page-list-item + .my-page-list-item {
  border-top: 1px solid var(--theme-line);
}
.my-page-list-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  color: inherit;
  text-decoration: none;
  transition: background 0.12s;
}
.my-page-list-link:hover {
  background: var(--theme-bg-soft);
}
.my-page-list-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.my-page-list-title {
  font-size: 14px;
  font-weight: 600;
}
.my-page-list-slug {
  font-size: 11px;
  color: var(--theme-fg-dim);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.my-page-list-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
