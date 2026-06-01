<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main :class="['public-content-shell', { 'public-content-shell-flush': isPage && showEyebrow }]">
      <template v-if="content">
        <!-- Hero (only for non-pages — pages get a Title Banner-style header instead) -->
        <section v-if="heroUrl && !isPage" class="public-content-hero">
          <img :src="heroUrl" :alt="content.title" />
        </section>

        <article :class="['public-content', { 'with-hero': heroUrl && !isPage, 'is-page': isPage }]">
          <!-- Pages: render the meta as a Title Banner block (title + excerpt as subtitle).
               When the author disables the eyebrow toggle, hide the whole banner section. -->
          <section
            v-if="isPage && showEyebrow"
            :class="[
              'block-title',
              'public-content-page-banner',
              'block-title-align-center',
              'block-title-height-medium',
              `block-title-text-${heroUrl ? 'light' : 'dark'}`,
            ]"
            :style="pageBannerStyle"
          >
            <div class="block-title-inner">
              <h1 class="block-title-title">{{ content.title }}</h1>
              <p v-if="content.summary" class="block-title-subtitle">{{ content.summary }}</p>
            </div>
          </section>

          <!-- Non-pages: magazine-style meta card with eyebrow + title + byline.
               When the author disables the eyebrow toggle, hide the whole header
               (and the summary line below it) so only the body blocks render —
               useful for "homepage"-style posts where the body provides its own title. -->
          <header v-else-if="showEyebrow" class="public-content-card">
            <p class="public-content-eyebrow">
              <template v-if="categoryLabels.length">
                <template v-for="(c, i) in categoryLabels" :key="c.id">
                  <NuxtLink :to="`/categories/${c.slug}`" class="public-content-eyebrow-link">{{ c.name }}</NuxtLink>
                  <span v-if="i < categoryLabels.length - 1" class="public-content-eyebrow-sep">·</span>
                </template>
              </template>
              <span v-else>{{ contentType.toUpperCase() }}</span>
            </p>
            <h1>{{ content.title }}</h1>
            <p class="public-content-byline">
              <img v-if="author?.avatarUrl" :src="author.avatarUrl" :alt="author.name" class="public-content-avatar" />
              <span v-if="author?.name">{{ author.name }}</span>
              <span v-if="content.publishedAt">{{ formatRelativeDate(content.publishedAt) }}</span>
            </p>
          </header>

          <!-- summary is shown only for non-pages with eyebrow enabled
               (pages already have it as subtitle in the banner) -->
          <p v-if="!isPage && showEyebrow && content.summary" class="public-content-summary">{{ content.summary }}</p>

          <BlockRenderer :blocks="content.blocks || []" :media-map="mediaMap" />

          <footer v-if="tagLabels.length" class="public-content-tags">
            <span class="public-content-tags-label">Tags</span>
            <ul>
              <li v-for="t in tagLabels" :key="t.id">
                <NuxtLink :to="`/tags/${t.slug}`">#{{ t.name }}</NuxtLink>
              </li>
            </ul>
          </footer>
        </article>
      </template>

      <section v-else-if="error" class="public-content-error">
        <h1>404</h1>
        <p>요청하신 콘텐츠를 찾을 수 없습니다.</p>
        <NuxtLink to="/">← 홈으로</NuxtLink>
      </section>
    </main>

    <DefaultThemeFooter :columns="footerColumns" imprint="© 2026 CMS · Template controlled · StyleFamily based" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'

type Content = {
  id: string
  contentType: string
  title: string
  slug: string
  summary?: string
  blocks?: Array<{ type: string; props: Record<string, unknown> }>
  html?: string
  publishedAt?: string
  thumbnailImageId?: string | null
  meta?: Record<string, unknown> & { showEyebrow?: boolean }
}
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type LabelRef = { id: string; name: string; slug: string }
type Author = { id: string; name: string; avatarUrl?: string } | null
type PublicResponse = {
  content: Content
  mediaMap: Record<string, MediaInfo>
  categoryLabels: LabelRef[]
  tagLabels: LabelRef[]
  author: Author
}

definePageMeta({
  layout: 'default',
  validate(route) {
    return ['post', 'page', 'notice', 'gallery'].includes(String(route.params.contentType))
  },
})

const route = useRoute()
const apiBase = useApiBase()

const contentType = computed(() => String(route.params.contentType || ''))
const slug = computed(() => String(route.params.slug || ''))
const isPage = computed(() => contentType.value === 'page')

const url = computed(
  () => `${apiBase}/api/public/contents/${encodeURIComponent(slug.value)}?type=${encodeURIComponent(contentType.value)}`,
)

const { data, error } = await useFetch<PublicResponse>(url, {
  key: () => `public:${contentType.value}:${slug.value}`,
})

const content = computed(() => data.value?.content ?? null)
const mediaMap = computed(() => data.value?.mediaMap ?? {})
const categoryLabels = computed(() => data.value?.categoryLabels ?? [])
const tagLabels = computed(() => data.value?.tagLabels ?? [])
const author = computed(() => data.value?.author ?? null)

// Show the eyebrow unless the author explicitly turned it off; missing meta
// defaults to true so existing posts keep their eyebrow.
const showEyebrow = computed(() => content.value?.meta?.showEyebrow !== false)

const heroUrl = computed(() => {
  const id = content.value?.thumbnailImageId
  if (!id) return ''
  return mediaMap.value[String(id)]?.paths?.original || ''
})

const pageBannerStyle = computed(() => {
  const s: Record<string, string> = {}
  if (heroUrl.value) s.backgroundImage = `url(${heroUrl.value})`
  return s
})


useHead(() => ({
  title: content.value?.title || '404',
  meta: [
    ...(content.value?.summary ? [{ name: 'description', content: content.value.summary }] : []),
    ...(heroUrl.value ? [{ property: 'og:image', content: heroUrl.value }] : []),
    ...(content.value?.title ? [{ property: 'og:title', content: content.value.title }] : []),
    ...(content.value?.summary ? [{ property: 'og:description', content: content.value.summary }] : []),
  ],
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
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
}

</script>

<style scoped>
.public-content-shell {
  padding: 40px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Pages: top banner sits flush against the topbar (no shell padding / no banner margin). */
.public-content-shell-flush {
  padding-top: 0;
}
.public-content-shell-flush .public-content {
  margin-top: 0;
}
.public-content-shell-flush > .public-content > .block-title:first-child {
  margin-top: 0;
}

/* ── Hero ── */
.public-content-hero {
  position: relative;
}
.public-content-hero img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

/* ── Article + meta card ── */
.public-content {
  max-width: 880px;
  margin: 0 auto;
}

.public-content-card {
  background: var(--theme-bg);
  padding: 28px 36px 24px;
  margin-bottom: 24px;
}

/* When a hero exists, the card overlaps the bottom of the hero, magazine-style. */
.public-content.with-hero .public-content-card {
  margin-top: -120px;
  position: relative;
  z-index: 1;
  box-shadow: 0 -1px 0 var(--theme-line), 0 12px 32px rgba(18, 24, 32, 0.04);
}

/* No hero: drop the card down a touch and put a top rule for visual anchor. */
.public-content:not(.with-hero) .public-content-card {
  padding-top: 0;
  padding-left: 0;
  padding-right: 0;
  border-bottom: 1px solid var(--theme-line);
  padding-bottom: 20px;
}

.public-content-eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--theme-accent, var(--theme-fg-dim));
  text-transform: uppercase;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.public-content-eyebrow-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s ease, border-bottom-color 0.15s ease;
  border-bottom: 1px solid transparent;
}

.public-content-eyebrow-link:hover {
  color: var(--theme-fg);
  border-bottom-color: currentColor;
}

.public-content-eyebrow-sep {
  color: var(--theme-fg-faint);
}

.public-content-card h1 {
  margin: 0 0 12px;
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 36px;
  line-height: 1.18;
  letter-spacing: -0.01em;
  font-weight: 700;
}

.public-content-byline {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--theme-fg-dim);
}
.public-content-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 4px;
  flex-shrink: 0;
}
.public-content-byline span + span::before {
  content: ' · ';
  margin: 0 4px;
  color: var(--theme-fg-faint);
}

.public-content-summary {
  margin: 0 0 24px;
  padding: 0 36px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--theme-fg-dim);
}

.public-content :deep(.block-renderer) {
  padding: 0 36px;
}

/* ── Tags footer ── */
.public-content-tags {
  margin: 40px 36px 0;
  padding-top: 20px;
  border-top: 1px solid var(--theme-line);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.public-content-tags-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--theme-fg-faint);
}
.public-content-tags ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.public-content-tags a {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--theme-line);
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  font-size: 12px;
  text-decoration: none;
  border-radius: 14px;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.public-content-tags a:hover {
  border-color: var(--theme-fg-dim);
  color: var(--theme-fg);
}

/* ── 404 ── */
.public-content-error {
  max-width: 480px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
}
.public-content-error h1 {
  font-size: 64px;
  margin: 0 0 12px;
  color: var(--theme-fg-faint);
}
.public-content-error p { margin: 0 0 16px; color: var(--theme-fg-dim); }
.public-content-error a { color: var(--theme-fg); text-decoration: underline; }

/* ── Mobile ── */
@media (max-width: 720px) {
  .public-content-shell {
    padding: 0 0 60px;
  }
  .public-content-hero img {
    aspect-ratio: 4 / 3;
  }
  .public-content-card {
    padding: 22px 20px 18px;
  }
  .public-content.with-hero .public-content-card {
    margin-top: -56px;
    margin-left: 16px;
    margin-right: 16px;
  }
  .public-content:not(.with-hero) .public-content-card {
    margin-left: 18px;
    margin-right: 18px;
  }
  .public-content-card h1 {
    font-size: 26px;
  }
  .public-content-summary {
    padding: 0 22px;
    font-size: 15px;
  }
  .public-content :deep(.block-renderer) {
    padding: 0 22px;
  }
  .public-content-tags {
    margin: 28px 22px 0;
  }
}
</style>
