<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Pages."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="pages" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>Pages.</h1>
            <div class="theme-backend-contents-filters">
              <select v-model="statusFilter" name="statusFilter">
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ total }} pages</span>
            <button type="button" class="theme-form-submit" @click="openNew">+ New Page</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading pages...</div>
        <div v-else-if="!items.length" class="theme-backend-state">등록된 페이지가 없습니다.</div>

        <section v-else class="theme-backend-contents-list">
          <article
            v-for="item in items"
            :key="item.id"
            :class="['theme-backend-content-row', { current: drawerId === item.id && drawerOpen }]"
            style="cursor: pointer"
            @click="openEdit(item)"
          >
            <div class="theme-backend-content-info">
              <span class="theme-backend-content-title">
                <span v-if="item.meta?.parentId" class="theme-meta" style="margin-right:4px">└</span>
                {{ item.title }}
                <span v-if="item.meta?.showInMenu" class="theme-backend-badge badge-type-post" style="font-size:10px;margin-left:6px">MENU</span>
              </span>
              <code class="theme-backend-content-slug">{{ item.slug }}</code>
            </div>
            <div class="theme-backend-content-meta">
              <span :class="['theme-backend-badge', `badge-status-${item.status}`]">{{ item.status }}</span>
              <span class="theme-meta">{{ formatDate(item.updatedAt) }}</span>
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

    <!-- ── Drawer ── -->
    <div v-if="drawerOpen" class="theme-backend-posts-modal" @click="closeDrawer">
      <div class="theme-backend-posts-drawer" @click.stop>
        <header class="theme-backend-posts-drawer-head">
          <strong>{{ isNewMode ? 'New Page' : (form.title || 'Page') }}</strong>
          <button type="button" class="theme-backend-close" aria-label="Close" @click="closeDrawer">×</button>
        </header>

        <div class="theme-backend-posts-drawer-body">
          <!-- LEFT: markdown editor -->
          <section class="theme-backend-posts-drawer-left">
            <div class="theme-backend-posts-md-head">
              <span class="theme-form-label">Markdown</span>
            </div>
            <textarea
              ref="markdownRef"
              v-model="form.markdown"
              class="theme-backend-posts-md"
              placeholder="페이지 본문을 Markdown으로 작성하세요."
            ></textarea>
          </section>

          <!-- RIGHT: form -->
          <section class="theme-backend-posts-drawer-right">
            <!-- Title + inline slug -->
            <div class="theme-form-field">
              <div class="theme-backend-posts-title-row">
                <span>Title</span>
                <span class="theme-meta">/</span>
                <input
                  v-model="form.slug"
                  class="theme-backend-posts-slug-inline"
                  maxlength="80"
                  placeholder="slug"
                />
              </div>
              <input
                v-model="form.title"
                required
                maxlength="200"
                placeholder="페이지 제목"
                @input="onTitleInput"
              />
            </div>

            <!-- Excerpt -->
            <label class="theme-form-field">
              <span>요약 (Excerpt)</span>
              <textarea v-model="form.excerpt" rows="3" maxlength="500" placeholder="페이지 요약"></textarea>
            </label>

            <!-- Row layout (frequently used: inline card picker, one-click insert) -->
            <div class="theme-form-field">
              <span>Row Layout</span>
              <div class="theme-backend-posts-row-grid">
                <button
                  v-for="opt in ROW_LAYOUTS"
                  :key="opt"
                  type="button"
                  class="theme-backend-posts-row-card"
                  :title="opt"
                  @click="insertRowLayout(opt)"
                >
                  <span
                    v-for="(weight, idx) in opt.split('-')"
                    :key="idx"
                    class="theme-backend-posts-row-card-col"
                    :style="{ flex: weight }"
                  ></span>
                </button>
              </div>
            </div>

            <!-- Block insert -->
            <div class="theme-form-field">
              <span>Block 삽입</span>
              <div class="theme-backend-posts-block-row">
                <select v-model="blockToInsert">
                  <option value="">— block 선택 —</option>
                  <option v-for="b in BLOCK_OPTIONS" :key="b.value" :value="b.value">{{ b.label }}</option>
                </select>
                <button
                  type="button"
                  class="theme-form-submit theme-form-submit-secondary-soft"
                  :disabled="!blockToInsert"
                  @click="insertBlock"
                >Insert</button>
              </div>
            </div>

            <!-- Parent page (hierarchical) -->
            <label class="theme-form-field">
              <span>Parent page</span>
              <select v-model="form.parentId">
                <option value="">— 최상위 (없음) —</option>
                <option
                  v-for="p in parentOptions"
                  :key="p.id"
                  :value="p.id"
                  :disabled="!isNewMode && p.id === drawerId"
                >{{ p.title }}</option>
              </select>
            </label>

            <!-- Template -->
            <label class="theme-form-field">
              <span>Template</span>
              <select v-model="form.template">
                <option v-for="t in TEMPLATE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>

            <!-- Featured image -->
            <div class="theme-form-field">
              <span>Featured Image</span>
              <div class="theme-backend-posts-featured">
                <div class="theme-backend-posts-featured-preview">
                  <img v-if="featuredImageUrl" :src="featuredImageUrl" alt="Featured" />
                  <span v-else class="theme-meta">이미지 없음</span>
                </div>
                <div class="theme-backend-posts-featured-actions">
                  <button
                    type="button"
                    class="theme-form-submit theme-form-submit-secondary-soft"
                    :disabled="featuredUploading"
                    @click="featuredFileRef?.click()"
                  >{{ featuredUploading ? '업로드 중...' : (form.thumbnailImageId ? '변경' : '파일 선택') }}</button>
                  <button
                    v-if="form.thumbnailImageId"
                    type="button"
                    class="theme-backend-link theme-backend-link-danger"
                    style="font-size:12px"
                    @click="clearFeaturedImage"
                  >제거</button>
                </div>
                <input
                  ref="featuredFileRef"
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change="onFeaturedFile"
                />
                <p v-if="featuredError" class="theme-form-status error" style="margin-top:6px">{{ featuredError }}</p>
              </div>
            </div>

            <!-- Status + showInMenu on one row -->
            <div class="theme-backend-posts-status-row">
              <label class="theme-form-field">
                <span>Status</span>
                <select v-model="form.status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
              <label class="theme-form-field">
                <span>메뉴 노출</span>
                <label class="theme-backend-posts-check" style="padding:8px 0 0">
                  <input type="checkbox" v-model="form.showInMenu" />
                  <span>showInMenu</span>
                </label>
              </label>
            </div>
          </section>
        </div>

        <!-- Footer -->
        <footer class="theme-backend-posts-drawer-foot">
          <p v-if="message" :class="['theme-form-status', { error: isError }]" style="margin: 0 auto 0 0">{{ message }}</p>
          <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="openPreview">미리보기</button>
          <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="clearForm">지우기</button>
          <button
            type="button"
            class="theme-form-submit"
            :disabled="isSaving || isDeleting"
            @click="savePage"
          >{{ isSaving ? 'Saving...' : (isNewMode ? '페이지 생성' : '저장') }}</button>
          <button
            v-if="!isNewMode"
            type="button"
            class="theme-form-submit theme-form-submit-warning"
            :disabled="isSaving || isDeleting"
            @click="deletePage"
          >{{ isDeleting ? '삭제 중...' : '삭제' }}</button>
        </footer>
      </div>
    </div>

    <!-- Media picker (for image blocks) -->
    <MediaPicker
      v-if="pickerOpen"
      :open="pickerOpen"
      multiple
      @close="pickerOpen = false"
      @pick="onPickerPick"
    />

    <!-- Block insert modal (for non-image blocks) -->
    <BlockInsertModal
      v-if="blockModalOpen"
      :type="blockToInsert"
      @close="cancelBlockModal"
      @insert="onBlockInserted"
    />

    <!-- Preview modal -->
    <div v-if="previewOpen" class="theme-backend-user-modal" @click="previewOpen = false">
      <div class="theme-backend-posts-preview" @click.stop>
        <header class="theme-backend-user-drawer-head">
          <strong>미리보기 · {{ form.title || 'Untitled' }}</strong>
          <button type="button" class="theme-backend-close" @click="previewOpen = false">×</button>
        </header>

        <div v-if="previewLoading" class="theme-backend-state">렌더링 중...</div>

        <div v-else class="theme-backend-posts-preview-body">
          <div v-if="previewErrors.length" class="theme-backend-posts-preview-errors">
            <strong>저장 전 다음 오류를 확인하세요:</strong>
            <ul>
              <li v-for="(e, i) in previewErrors" :key="i">{{ e }}</li>
            </ul>
          </div>

          <article v-if="previewBlocks.length">
            <h1 v-if="form.title" class="theme-backend-posts-preview-title">{{ form.title }}</h1>
            <p v-if="form.excerpt" class="theme-backend-posts-preview-excerpt">{{ form.excerpt }}</p>
            <BlockRenderer :blocks="previewBlocks" :media-map="previewMediaMap" />
          </article>
          <p v-else-if="!previewErrors.length" class="theme-meta">본문 없음.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import MediaPicker from '~/components/admin/MediaPicker.vue'
import BlockInsertModal from '~/components/admin/BlockInsertModal.vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { ROW_LAYOUTS } from '~~/shared/blocks/registry.js'

definePageMeta({ layout: 'default' })

type MediaItem = { id: string; paths: { original: string } }

type PageListItem = {
  id: string
  title: string
  slug: string
  status: string
  updatedAt: string
  meta?: { parentId?: string | null; template?: string; showInMenu?: boolean }
}

type PageDetail = PageListItem & {
  summary: string
  markdown: string
  thumbnailImageId: string | null
}

const LIMIT = 20

const BLOCK_OPTIONS = [
  { value: 'title', label: 'Title Banner (배너)' },
  { value: 'notice', label: 'Notice (공지)' },
  { value: 'highlight', label: 'Highlight (강조)' },
  { value: 'quote', label: 'Quote (인용)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'button', label: 'Button' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'imageGrid', label: 'Image Grid' },
  { value: 'slide', label: 'Slide' },
  { value: 'file', label: 'File' },
  { value: 'map', label: 'Map' },
  { value: 'timeline', label: 'Timeline' },
]

// Templates are not yet wired into a renderer — values are placeholders.
const TEMPLATE_OPTIONS = [
  { value: 'page-basic', label: 'Basic (기본)' },
  { value: 'page-landing', label: 'Landing (랜딩)' },
  { value: 'page-about', label: 'About (소개)' },
]

const IMAGE_BLOCKS = new Set(['gallery', 'imageGrid', 'slide'])

// Blocks whose JSON structure is too complex for BlockInsertModal — insert a placeholder template the user edits.
const TIMELINE_PLACEHOLDER = [
  { date: 'MONTH - YEAR', title: 'Add a short title for the timeline event', description: 'Briefly describe the timeline event providing your audience with all the details they need to know about it.', imageId: '' },
  { date: 'MONTH - YEAR', title: 'Add a short title for the timeline event', description: 'Briefly describe the timeline event.', imageId: '' },
]
const TEXT_TEMPLATES: Record<string, string> = {
  timeline: `:::timeline\nitems: ${JSON.stringify(TIMELINE_PLACEHOLDER)}\n:::`,
}

function buildImageBlock(type: string, imageIds: string[]): string {
  if (type === 'gallery') return `:::gallery\nimageIds: ${JSON.stringify(imageIds)}\n:::`
  if (type === 'imageGrid') {
    const items = imageIds.map(id => ({ imageId: id, caption: '' }))
    return `:::imageGrid\ncolumns: 3\ngap: medium\nitems: ${JSON.stringify(items)}\n:::`
  }
  if (type === 'slide') {
    const items = imageIds.map(id => ({ imageId: id, title: '', desc: '' }))
    return `:::slide\nitems: ${JSON.stringify(items)}\n:::`
  }
  return ''
}

const { navItems } = useBackendMenu()
const { activeSiteId } = useSiteAdmin()
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

const isSidebarOpen = ref(false)
const drawerOpen = ref(false)
const previewOpen = ref(false)
const isNewMode = ref(false)
const drawerId = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const message = ref('')
const isError = ref(false)
const slugDirty = ref(false)

const statusFilter = ref('')
const skip = ref(0)

const markdownRef = ref<HTMLTextAreaElement | null>(null)
const featuredFileRef = ref<HTMLInputElement | null>(null)
const featuredUploading = ref(false)
const featuredError = ref('')
const featuredImageUrl = ref('')
const blockToInsert = ref('')
const pickerOpen = ref(false)
const pickerCursor = ref(0)
const blockModalOpen = ref(false)
const blockModalCursor = ref(0)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  markdown: '',
  parentId: '',
  template: 'page-basic',
  showInMenu: false,
  thumbnailImageId: '',
  status: 'draft',
})

// ── List ─────────────────────────────────────────────────────────────────────

const listUrl = computed(() => {
  const p = new URLSearchParams()
  p.set('siteId', activeSiteId.value || '')
  p.set('type', 'page')
  p.set('limit', String(LIMIT))
  p.set('skip', String(skip.value))
  if (statusFilter.value) p.set('status', statusFilter.value)
  return `${apiBase}/api/admin/contents?${p}`
})

const { data, pending, refresh } = useFetch<{ items: PageListItem[]; total: number }>(
  listUrl,
  {
    key: 'admin-pages',
    credentials: 'include',
    server: false,
    watch: [statusFilter, activeSiteId, skip],
    default: () => ({ items: [], total: 0 }),
  },
)

const items = computed<PageListItem[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

watch([statusFilter, activeSiteId], () => { skip.value = 0 })

// Parent page dropdown reuses the same list — sufficient for typical site sizes.
const parentOptions = computed(() => items.value)

// ── Media (for featured image URL lookup) ────────────────────────────────────

const mediaUrl = computed(() => `${apiBase}/api/admin/media`)
const { data: mediaData } = useFetch<{ items: MediaItem[] }>(mediaUrl, {
  key: 'admin-media-for-pages',
  credentials: 'include',
  server: false,
  watch: [activeSiteId],
  default: () => ({ items: [] }),
})
const mediaMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const item of mediaData.value?.items ?? []) m[item.id] = item.paths?.original || ''
  return m
})

watch([() => form.thumbnailImageId, mediaMap], () => {
  if (form.thumbnailImageId && mediaMap.value[form.thumbnailImageId]) {
    featuredImageUrl.value = mediaMap.value[form.thumbnailImageId]
  } else if (!form.thumbnailImageId) {
    featuredImageUrl.value = ''
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣ᄀ-ᇿ㄰-㆏-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function onTitleInput() {
  if (!isNewMode.value || slugDirty.value) return
  form.slug = nameToSlug(form.title)
}

watch(() => form.slug, (v, old) => {
  if (isNewMode.value && v !== old && document.activeElement instanceof HTMLInputElement) {
    if ((document.activeElement as HTMLInputElement).classList.contains('theme-backend-posts-slug-inline')) {
      slugDirty.value = true
    }
  }
})

function insertAtCursor(snippet: string) {
  const ta = markdownRef.value
  if (ta) {
    const start = ta.selectionStart ?? form.markdown.length
    const end = ta.selectionEnd ?? start
    const before = form.markdown.slice(0, start)
    const after = form.markdown.slice(end)
    const needsLeadingBlank = before && !before.endsWith('\n\n')
    const needsTrailingBlank = after && !after.startsWith('\n\n')
    const insert = `${needsLeadingBlank ? '\n\n' : ''}${snippet}${needsTrailingBlank ? '\n\n' : ''}`
    form.markdown = before + insert + after
    nextTick(() => {
      ta.focus()
      const newPos = start + insert.length
      ta.setSelectionRange(newPos, newPos)
    })
  } else {
    form.markdown += `\n\n${snippet}\n`
  }
}

function insertBlock() {
  const key = blockToInsert.value
  if (!key) return
  const ta = markdownRef.value
  if (IMAGE_BLOCKS.has(key)) {
    pickerCursor.value = ta?.selectionStart ?? form.markdown.length
    pickerOpen.value = true
    return
  }
  if (TEXT_TEMPLATES[key]) {
    const cursor = ta?.selectionStart ?? form.markdown.length
    if (ta) ta.setSelectionRange(cursor, cursor)
    insertAtCursor(TEXT_TEMPLATES[key])
    blockToInsert.value = ''
    return
  }
  blockModalCursor.value = ta?.selectionStart ?? form.markdown.length
  blockModalOpen.value = true
}

function insertRowLayout(layout: string) {
  const cols = layout.split('-').length
  const lines = [':::row', `layout: ${layout}`, '']
  for (let i = 0; i < cols; i++) {
    lines.push(':::col', '', ':::')
  }
  lines.push(':::')
  insertAtCursor(lines.join('\n'))
}

function cancelBlockModal() {
  blockModalOpen.value = false
  blockToInsert.value = ''
}

function onBlockInserted(snippet: string) {
  blockModalOpen.value = false
  const ta = markdownRef.value
  if (ta) ta.setSelectionRange(blockModalCursor.value, blockModalCursor.value)
  insertAtCursor(snippet)
  blockToInsert.value = ''
}

function onPickerPick(ids: string[]) {
  const type = blockToInsert.value
  pickerOpen.value = false
  if (!type || !ids.length) { blockToInsert.value = ''; return }
  const snippet = buildImageBlock(type, ids)
  const ta = markdownRef.value
  if (ta) ta.setSelectionRange(pickerCursor.value, pickerCursor.value)
  insertAtCursor(snippet)
  blockToInsert.value = ''
}

// ── Server-rendered preview ──────────────────────────────────────────────────

type PreviewResult = {
  blocks: Array<{ type: string; props: Record<string, unknown> }>
  mediaMap: Record<string, { paths?: { original?: string }; title?: string; alt?: string }>
  errors: string[]
}

const previewLoading = ref(false)
const previewBlocks = ref<PreviewResult['blocks']>([])
const previewMediaMap = ref<PreviewResult['mediaMap']>({})
const previewErrors = ref<string[]>([])

async function openPreview() {
  previewOpen.value = true
  previewLoading.value = true
  previewErrors.value = []
  previewBlocks.value = []
  previewMediaMap.value = {}
  try {
    const result = await $fetch<PreviewResult>(
      `${apiBase}/api/admin/contents/preview?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
      {
        method: 'POST',
        credentials: 'include',
        body: { markdown: form.markdown },
      },
    )
    previewBlocks.value = result.blocks || []
    previewMediaMap.value = result.mediaMap || {}
    previewErrors.value = result.errors || []
  } catch (err: unknown) {
    const e = err as { data?: { error?: string }, message?: string }
    previewErrors.value = [e?.data?.error || e?.message || '미리보기 생성 실패']
  } finally {
    previewLoading.value = false
  }
}

// ── Featured image ───────────────────────────────────────────────────────────

async function onFeaturedFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  input.value = ''
  featuredError.value = ''
  featuredUploading.value = true
  try {
    const formData = new FormData()
    formData.append('files', file)
    const result = await $fetch<{ items: Array<{ id: string; paths: { original: string } }> }>(
      `${apiBase}/api/admin/media/upload`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-admin-site': activeSiteId.value || '' },
        body: formData,
      },
    )
    const item = result.items?.[0]
    if (item) {
      form.thumbnailImageId = item.id
      featuredImageUrl.value = item.paths?.original || ''
    }
  } catch (err: unknown) {
    featuredError.value = err instanceof Error ? err.message : '업로드 실패'
  } finally {
    featuredUploading.value = false
  }
}

function clearFeaturedImage() {
  form.thumbnailImageId = ''
  featuredImageUrl.value = ''
}

// ── Drawer open/close ────────────────────────────────────────────────────────

function resetForm() {
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.markdown = ''
  form.parentId = ''
  form.template = 'page-basic'
  form.showInMenu = false
  form.thumbnailImageId = ''
  form.status = 'draft'
  featuredImageUrl.value = ''
  featuredError.value = ''
  blockToInsert.value = ''
  slugDirty.value = false
  message.value = ''
  isError.value = false
}

function clearForm() {
  if (!window.confirm('입력한 내용을 모두 지울까요?')) return
  resetForm()
}

function openNew() {
  isNewMode.value = true
  drawerId.value = ''
  resetForm()
  drawerOpen.value = true
}

async function openEdit(item: PageListItem) {
  isNewMode.value = false
  drawerId.value = item.id
  resetForm()
  drawerOpen.value = true

  try {
    const detail = await $fetch<{ content: PageDetail }>(
      `${apiBase}/api/admin/contents/${item.id}?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
      { credentials: 'include' },
    )
    const c = detail.content
    form.title = c.title || ''
    form.slug = c.slug || ''
    form.excerpt = c.summary || ''
    form.markdown = c.markdown || ''
    form.parentId = c.meta?.parentId ? String(c.meta.parentId) : ''
    form.template = c.meta?.template || 'page-basic'
    form.showInMenu = !!c.meta?.showInMenu
    form.thumbnailImageId = c.thumbnailImageId ? String(c.thumbnailImageId) : ''
    form.status = c.status || 'draft'
    slugDirty.value = true
  } catch {
    isError.value = true
    message.value = '페이지를 불러오지 못했습니다.'
  }
}

function closeDrawer() {
  if (previewOpen.value) { previewOpen.value = false; return }
  drawerOpen.value = false
}

// ── Save / delete ────────────────────────────────────────────────────────────

async function savePage() {
  if (!form.title.trim()) {
    isError.value = true
    message.value = '제목을 입력해주세요.'
    return
  }
  message.value = ''
  isError.value = false
  isSaving.value = true
  try {
    const body: Record<string, unknown> = {
      contentType: 'page',
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      summary: form.excerpt.trim(),
      markdown: form.markdown,
      thumbnailImageId: form.thumbnailImageId || null,
      status: form.status,
      meta: {
        parentId: form.parentId || null,
        template: form.template,
        showInMenu: form.showInMenu,
      },
    }
    if (isNewMode.value) {
      const result = await $fetch<{ content: PageDetail }>(
        `${apiBase}/api/admin/contents?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
        { method: 'POST', credentials: 'include', body },
      )
      isNewMode.value = false
      drawerId.value = result.content.id
      form.slug = result.content.slug
      message.value = '페이지가 생성되었습니다.'
    } else {
      const result = await $fetch<{ content: PageDetail }>(
        `${apiBase}/api/admin/contents/${drawerId.value}?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
        { method: 'PUT', credentials: 'include', body },
      )
      form.slug = result.content.slug
      message.value = '저장되었습니다.'
    }
    await refresh()
    setTimeout(() => { message.value = '' }, 2200)
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function deletePage() {
  if (!drawerId.value || isDeleting.value) return
  if (!window.confirm(`'${form.title}' 페이지를 삭제할까요?`)) return
  message.value = ''
  isError.value = false
  isDeleting.value = true
  try {
    await $fetch(
      `${apiBase}/api/admin/contents/${drawerId.value}?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
      { method: 'DELETE', credentials: 'include' },
    )
    await refresh()
    closeDrawer()
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '삭제에 실패했습니다.'
  } finally {
    isDeleting.value = false
  }
}
</script>
