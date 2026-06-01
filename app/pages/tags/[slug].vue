<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main class="category-shell">
      <template v-if="tag">
        <header class="category-head">
          <p class="category-eyebrow">TAG</p>
          <h1>#{{ tag.name }}</h1>
          <p class="category-meta">{{ total }}개의 글</p>
        </header>

        <section v-if="items.length" class="category-grid">
          <NuxtLink
            v-for="item in items"
            :key="item.id"
            :to="`/${item.contentType}/${item.slug}`"
            class="category-card"
          >
            <div class="category-card-image">
              <img
                v-if="thumbUrl(item)"
                :src="thumbUrl(item)"
                :alt="item.title"
                loading="lazy"
              />
              <div v-else class="category-card-image-placeholder">
                <span>NO IMAGE</span>
              </div>
            </div>
            <div class="category-card-body">
              <h2 class="category-card-title">{{ item.title }}</h2>
              <p class="category-card-meta">
                <img
                  v-if="author(item)?.avatarUrl"
                  :src="author(item).avatarUrl"
                  :alt="author(item).name"
                  class="category-card-avatar"
                />
                <span v-if="author(item)?.name">{{ author(item).name }}</span>
                <span v-if="item.publishedAt">{{ formatRelativeDate(item.publishedAt) }}</span>
              </p>
              <p v-if="item.summary" class="category-card-excerpt">{{ item.summary }}</p>
            </div>
          </NuxtLink>
        </section>

        <section v-else class="category-empty">
          <p>이 태그가 붙은 글이 없습니다.</p>
          <NuxtLink to="/">← 홈으로</NuxtLink>
        </section>
      </template>

      <section v-else-if="error" class="category-empty">
        <h1>404</h1>
        <p>요청하신 태그를 찾을 수 없습니다.</p>
        <NuxtLink to="/">← 홈으로</NuxtLink>
      </section>
    </main>

    <DefaultThemeFooter :columns="footerColumns" imprint="© 2026 CMS · Template controlled · StyleFamily based" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'

type Tag = { id: string; name: string; slug: string; usageCount?: number }
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type AuthorInfo = { id: string; name: string; avatarUrl?: string }
type Item = {
  id: string
  title: string
  slug: string
  summary: string
  contentType: string
  publishedAt?: string
  thumbnailImageId?: string | null
  authorId?: string | null
  meta?: { featured?: boolean }
}
type Response = {
  tag: Tag
  items: Item[]
  total: number
  mediaMap: Record<string, MediaInfo>
  authorMap: Record<string, AuthorInfo>
}

definePageMeta({ layout: 'default' })

const route = useRoute()
const apiBase = useApiBase()

const slug = computed(() => String(route.params.slug || ''))
const url = computed(
  () => `${apiBase}/api/public/tags/${encodeURIComponent(slug.value)}?type=post`,
)

const { data, error } = await useFetch<Response>(url, {
  key: () => `tag:${slug.value}`,
})

const tag = computed(() => data.value?.tag ?? null)
const items = computed<Item[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const mediaMap = computed(() => data.value?.mediaMap ?? {})
const authorMap = computed(() => data.value?.authorMap ?? {})

function thumbUrl(item: Item): string {
  if (!item.thumbnailImageId) return ''
  return mediaMap.value[item.thumbnailImageId]?.paths?.original || ''
}

function author(item: Item): AuthorInfo | null {
  if (!item.authorId) return null
  return authorMap.value[item.authorId] ?? null
}

useHead(() => ({
  title: tag.value ? `#${tag.value.name} — Tag` : '404',
}))

const navItems = useSiteNav('header')

const _fallbackFooter = [
  { title: 'Template', body: '코드로 정의된 Template 안에서만 레이아웃이 결정됩니다.' },
  { title: 'StyleFamily', body: '색·타이포·여백은 미리 정의된 family 중에서 선택됩니다.' },
  { title: 'Blocks', body: 'Markdown 안의 허용된 Block 만으로 표현이 확장됩니다.' },
]
const _dynamicFooter = useSiteFooterColumns()
const footerColumns = computed(() => _dynamicFooter.value.length ? _dynamicFooter.value : _fallbackFooter)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

</script>

<style scoped>
.category-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

/* ── Header ── */
.category-head {
  margin-bottom: 36px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--theme-line);
}
.category-eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--theme-accent, var(--theme-fg-dim));
  text-transform: uppercase;
}
.category-head h1 {
  margin: 0 0 8px;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 40px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  font-weight: 700;
}
.category-meta {
  margin: 0;
  font-size: 13px;
  color: var(--theme-fg-dim);
}

/* ── Card grid ── */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 28px;
}

.category-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.category-card:hover {
  border-color: var(--theme-fg-dim);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(18, 24, 32, 0.08);
}

.category-card-image {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--theme-bg-soft);
  overflow: hidden;
}
.category-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.category-card-image-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--theme-fg-faint);
}

.category-card-body {
  padding: 18px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.category-card-title {
  margin: 0;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 19px;
  line-height: 1.3;
  letter-spacing: -0.005em;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  color: var(--theme-fg-dim);
}
.category-card-meta span + span::before {
  content: '·';
  margin: 0 4px;
  color: var(--theme-fg-faint);
}
.category-card-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 4px;
  flex-shrink: 0;
}

.category-card-excerpt {
  margin: 4px 0 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--theme-fg-dim);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Empty / 404 ── */
.category-empty {
  max-width: 480px;
  margin: 0 auto;
  padding: 60px 24px;
  text-align: center;
  color: var(--theme-fg-dim);
}
.category-empty h1 {
  font-size: 56px;
  margin: 0 0 12px;
  color: var(--theme-fg-faint);
}
.category-empty a {
  color: var(--theme-fg);
  text-decoration: underline;
}

/* ── Mobile ── */
@media (max-width: 720px) {
  .category-shell {
    padding: 28px 18px 60px;
  }
  .category-head h1 {
    font-size: 28px;
  }
  .category-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
