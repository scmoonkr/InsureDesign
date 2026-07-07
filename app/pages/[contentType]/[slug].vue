<template>
  <div class="theme-default">
    <DefaultThemeTopbar :items="navItems" />

    <main :class="['public-content-shell', `tpl-${template}`, { 'public-content-shell-flush': useBanner && showEyebrow }]">
      <template v-if="content">
        <!-- Hero (basic/card layout only — banner templates use the title banner instead) -->
        <section v-if="heroUrl && !useBanner" class="public-content-hero">
          <img :src="heroUrl" :alt="content.title" />
        </section>

        <div class="public-content-main">
        <article :class="['public-content', { 'with-hero': heroUrl && !useBanner, 'is-page': useBanner }]">
          <!-- Banner templates: render meta as a Title Banner block (title + excerpt).
               When the author disables the eyebrow toggle, hide the whole banner section. -->
          <section
            v-if="useBanner && showEyebrow"
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
          <p v-if="!useBanner && showEyebrow && content.summary" class="public-content-summary">{{ content.summary }}</p>

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

        <!-- Sidebar template: 카테고리 + 최근 글 위젯 -->
        <aside v-if="hasSidebar" class="public-content-sidebar">
          <div class="pcs-widget">
            <h3>카테고리</h3>
            <ul>
              <li v-for="c in sidebarCategories" :key="c.id">
                <NuxtLink :to="`/categories/${c.slug}`">{{ c.name }}</NuxtLink>
              </li>
            </ul>
          </div>
          <div class="pcs-widget">
            <h3>최근 글</h3>
            <ul>
              <li v-for="p in sidebarPosts" :key="p.id">
                <NuxtLink :to="`/post/${p.slug}`">{{ p.title }}</NuxtLink>
              </li>
            </ul>
          </div>
        </aside>
        </div>
      </template>

      <section v-else-if="locked" class="public-content-error">
        <h1>🔒</h1>
        <p v-if="lockedRequiresLogin">로그인이 필요한 콘텐츠입니다.</p>
        <p v-else>이 콘텐츠를 볼 권한이 없습니다.</p>
        <NuxtLink v-if="lockedRequiresLogin" to="/login">로그인 →</NuxtLink>
        <NuxtLink v-else to="/">← 홈으로</NuxtLink>
      </section>

      <section v-else-if="error" class="public-content-error">
        <h1>404</h1>
        <p>요청하신 콘텐츠를 찾을 수 없습니다.</p>
        <NuxtLink to="/">← 홈으로</NuxtLink>
      </section>
    </main>

    <DefaultThemeFooter :columns="footerColumns" :imprint="footerImprint" />
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
  content?: Content
  mediaMap?: Record<string, MediaInfo>
  categoryLabels?: LabelRef[]
  tagLabels?: LabelRef[]
  author?: Author
  // Role-gated page/post the requester may not view.
  locked?: boolean
  accessLevel?: string
  requiresLogin?: boolean
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

// ── Template layout (basic·narrow·wide·sidebar·backend) ──────────────────────
const VALID_TPL = ['basic', 'narrow', 'wide', 'sidebar', 'backend']
const template = computed(() => {
  const c = content.value as unknown as { template?: string; meta?: { template?: string } } | null
  const t = c?.template || c?.meta?.template
  if (t && VALID_TPL.includes(t)) return t
  return isPage.value ? 'narrow' : 'basic' // 미설정/구값 폴백
})
const useBanner = computed(() => template.value !== 'basic') // basic=카드 헤더, 그 외=배너
const hasSidebar = computed(() => template.value === 'sidebar')

const sidebarCategories = ref<{ id: string; name: string; slug: string }[]>([])
const sidebarPosts = ref<{ id: string; title: string; slug: string }[]>([])
onMounted(async () => {
  if (!hasSidebar.value) return
  try {
    const [cats, posts] = await Promise.all([
      $fetch<{ items: { id: string; name: string; slug: string }[] }>(`${apiBase}/api/public/categories`),
      $fetch<{ items: { id: string; title: string; slug: string }[] }>(`${apiBase}/api/public/post-cards?limit=5`),
    ])
    sidebarCategories.value = cats.items || []
    sidebarPosts.value = posts.items || []
  } catch { /* sidebar is decorative — ignore failures */ }
})

const url = computed(
  () => `${apiBase}/api/public/contents/${encodeURIComponent(slug.value)}?type=${encodeURIComponent(contentType.value)}`,
)

const { data, error } = await useFetch<PublicResponse>(url, {
  key: () => `public:${contentType.value}:${slug.value}`,
})

const content = computed(() => data.value?.content ?? null)
const locked = computed(() => data.value?.locked === true)
const lockedRequiresLogin = computed(() => data.value?.requiresLogin === true)
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
const siteName = useSiteName()
const footerImprint = computed(() => `© 2026 ${siteName.value} · Template controlled · StyleFamily based`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
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
.public-content-shell-flush .public-content > .block-title:first-child {
  margin-top: 0;
}

/* ── Template layouts (basic·narrow·wide·sidebar·backend) ──────────────
   basic/narrow keep the default 1200px shell + 880px reading column. */
.tpl-wide,
.tpl-sidebar {
  max-width: var(--theme-content-max);
  padding-left: var(--theme-pad-x);
  padding-right: var(--theme-pad-x);
}
.tpl-backend {
  max-width: none;
  padding-left: var(--theme-pad-x);
  padding-right: var(--theme-pad-x);
}
/* wide/sidebar/backend: content fills instead of the narrow reading column */
.tpl-wide .public-content,
.tpl-sidebar .public-content,
.tpl-backend .public-content {
  max-width: none;
}
/* sidebar: article + right column */
.tpl-sidebar .public-content-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 48px;
  align-items: start;
}
.public-content-sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  position: sticky;
  top: calc(var(--theme-topbar-h, 64px) + 24px);
}
.pcs-widget h3 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--theme-line);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--theme-fg-dim);
}
.pcs-widget ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pcs-widget a { color: var(--theme-fg); text-decoration: none; font-size: 14px; line-height: 1.4; }
.pcs-widget a:hover { text-decoration: underline; }
@media (max-width: 900px) {
  .tpl-sidebar .public-content-main { grid-template-columns: 1fr; }
  .public-content-sidebar { position: static; }
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
  color: #93b8d4;
  text-decoration: none;
  transition: color 0.15s ease;
}

.public-content-eyebrow-link:hover {
  color: #1a6eb8;
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
  font-size: 12px;
  text-decoration: none;
  color: #93b8d4;
  transition: color 0.15s ease;
}
.public-content-tags a:hover {
  color: #1a6eb8;
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
