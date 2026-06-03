<template>
  <div class="content-editor">
    <div class="theme-backend-posts-drawer-body">
      <!-- LEFT: markdown -->
      <section class="theme-backend-posts-drawer-left">
        <div class="theme-backend-posts-md-head">
          <span class="theme-form-label">Markdown</span>
        </div>
        <textarea
          ref="markdownRef"
          v-model="form.markdown"
          class="theme-backend-posts-md"
          :placeholder="markdownPlaceholder"
        ></textarea>
      </section>

      <!-- RIGHT: form -->
      <section class="theme-backend-posts-drawer-right">
        <!-- Title + slug (slug is read-only; auto-derived from title for new content,
             preserved as-is for existing content) -->
        <div class="theme-form-field">
          <div class="theme-backend-posts-title-row">
            <span>Title</span>
            <span class="theme-meta">/</span>
            <input
              :value="form.slug"
              class="theme-backend-posts-slug-inline"
              maxlength="80"
              placeholder="slug (자동 생성)"
              readonly
              tabindex="-1"
              :title="isNewMode ? '제목에서 자동 생성' : '저장된 slug — 변경 불가'"
            />
          </div>
          <input
            v-model="form.title"
            required
            maxlength="200"
            :placeholder="isPost ? '제목' : '페이지 제목'"
            @input="onTitleInput"
          />
        </div>

        <!-- Excerpt -->
        <label class="theme-form-field">
          <span>요약 (Excerpt)</span>
          <textarea
            v-model="form.excerpt"
            rows="3"
            maxlength="500"
            :placeholder="isPost ? '목록·검색에 노출될 짧은 요약' : '페이지 요약'"
          ></textarea>
        </label>

        <!-- Row layout (frequently used: inline card picker) -->
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

        <!-- Block insert — 일반 블록 -->
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
              @click="openSamplePreview"
              title="선택한 block의 sample을 미리 본 뒤 그대로 삽입"
            >Sample</button>
            <button
              type="button"
              class="theme-form-submit theme-form-submit-secondary-soft"
              :disabled="!blockToInsert"
              @click="insertBlock"
            >Insert</button>
          </div>
        </div>

        <!-- Block insert — 커스텀 블록 -->
        <div class="theme-form-field custom-block-field">
          <span>커스텀 블록</span>
          <div class="theme-backend-posts-block-row">
            <select v-model="customBlockToInsert">
              <option value="">— 커스텀 블록 선택 —</option>
              <option v-for="b in CUSTOM_BLOCK_OPTIONS" :key="b.value" :value="b.value">
                {{ b.label }} <template v-if="b.site">({{ b.site }})</template>
              </option>
            </select>
            <button
              type="button"
              class="theme-form-submit theme-form-submit-secondary-soft"
              :disabled="!customBlockToInsert"
              @click="insertCustomBlock"
            >Insert</button>
          </div>
        </div>

        <!-- Categories (admin only — both posts and pages) — custom dropdown
             with chips so it reads like a regular single-line select but allows
             toggling multiple options. -->
        <div v-if="isAdmin" class="theme-form-field">
          <span>Category</span>
          <CategorySelect
            v-model="form.categoryIds"
            :options="categoryRows"
            placeholder="카테고리 선택 (없음)"
            empty-text="등록된 카테고리가 없습니다."
          />
        </div>

        <!-- POST: Tags (both modes) -->
        <div v-if="isPost" class="theme-form-field">
          <span>Tags</span>
          <input v-model="form.tagNamesInput" placeholder="콤마로 구분 (예: 공지, 행사, 2026)" />
        </div>

        <!-- PAGE: Parent page (admin only) -->
        <label v-if="isPage && isAdmin" class="theme-form-field">
          <span>Parent page</span>
          <select v-model="form.parentId">
            <option value="">— 최상위 (없음) —</option>
            <option
              v-for="p in parentOptions"
              :key="p.id"
              :value="p.id"
              :disabled="p.id === props.id"
            >{{ p.title }}</option>
          </select>
        </label>

        <!-- PAGE: Template (admin only) -->
        <label v-if="isPage && isAdmin" class="theme-form-field">
          <span>Template</span>
          <select v-model="form.template">
            <option v-for="t in TEMPLATE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>

        <!-- Bottom row: 2-column — left has Status, right has Featured Image.
             Featured/Eyebrow flag row sits BELOW as a full-width grid spanning
             both columns. -->
        <div :class="['content-editor-bottom', { 'no-left': !isAdmin }]">
          <div v-if="isAdmin" class="content-editor-bottom-left">
            <label class="theme-form-field">
              <span>Status</span>
              <select v-model="form.status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="deleted">Deleted (휴지통)</option>
              </select>
            </label>
          </div>

          <div class="content-editor-bottom-right">
            <span class="theme-form-label">Featured Image</span>
            <div
              :class="[
                'featured-dropzone',
                {
                  'is-dragover': isDraggingOver && !isAdmin,
                  'has-image': !!form.thumbnailImageId,
                  'is-uploading': featuredUploading,
                },
              ]"
              role="button"
              tabindex="0"
              @click="onFeaturedClick"
              @keydown.enter.space.prevent="onFeaturedClick"
              @dragenter.prevent="isAdmin ? null : (isDraggingOver = true)"
              @dragover.prevent="isAdmin ? null : (isDraggingOver = true)"
              @dragleave.prevent="isAdmin ? null : (isDraggingOver = false)"
              @drop.prevent="isAdmin ? null : onFeaturedDrop($event)"
            >
              <img v-if="featuredImageUrl" :src="featuredImageUrl" alt="Featured" />
              <div v-else class="featured-dropzone-empty">
                <span>{{ isAdmin ? 'Media에서 선택' : '이미지를 끌어다 놓거나 클릭' }}</span>
              </div>
              <button
                v-if="form.thumbnailImageId && !featuredUploading"
                type="button"
                class="featured-dropzone-remove"
                aria-label="이미지 제거"
                @click.stop="clearFeaturedImage"
              >×</button>
              <div v-if="isDraggingOver && !isAdmin" class="featured-dropzone-overlay">Drop here</div>
              <div v-if="featuredUploading" class="featured-dropzone-overlay">업로드 중...</div>
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

          <!-- Featured/showInMenu + Eyebrow — full row spanning both columns -->
          <div v-if="isAdmin" class="content-editor-bottom-flags">
            <label v-if="isPost" class="theme-form-field">
              <span>이 글을 추천으로 표시</span>
              <label class="theme-backend-posts-check">
                <input type="checkbox" v-model="form.featured" />
                <span>Featured</span>
              </label>
            </label>
            <label v-else class="theme-form-field">
              <span>메뉴 노출</span>
              <label class="theme-backend-posts-check">
                <input type="checkbox" v-model="form.showInMenu" />
                <span>showInMenu</span>
              </label>
            </label>

            <label class="theme-form-field">
              <span>Eyebrow 표시</span>
              <label class="theme-backend-posts-check">
                <input type="checkbox" v-model="form.showEyebrow" />
                <span>제목·작성자·날짜 헤더 표시 (페이지는 banner)</span>
              </label>
            </label>
          </div>
        </div>
      </section>
    </div>

    <!-- Footer actions -->
    <footer class="theme-backend-posts-drawer-foot">
      <p v-if="message" :class="['theme-form-status', { error: isError }]" style="margin: 0 auto 0 0">{{ message }}</p>
      <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="openPreview">미리보기</button>
      <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="onCancel">취소</button>
      <button
        type="button"
        class="theme-form-submit"
        :disabled="isSaving || isDeleting"
        @click="save"
      >{{ isSaving ? 'Saving...' : (isNewMode ? (isPost ? '글 생성' : '페이지 생성') : '저장') }}</button>
      <button
        v-if="!isNewMode && isAdmin"
        type="button"
        class="theme-form-submit theme-form-submit-warning"
        :disabled="isSaving || isDeleting"
        @click="remove"
      >{{ isDeleting ? '삭제 중...' : '삭제' }}</button>
    </footer>

    <!-- Media picker (for image blocks — multiple selection) -->
    <MediaPicker
      v-if="pickerOpen"
      :open="pickerOpen"
      multiple
      @close="pickerOpen = false"
      @pick="onPickerPick"
    />

    <!-- Featured-image picker (admin mode — single selection from media library) -->
    <MediaPicker
      v-if="featuredPickerOpen"
      :open="featuredPickerOpen"
      @close="featuredPickerOpen = false"
      @pick="onFeaturedPickerPick"
    />

    <!-- Block insert modal (schema-driven form for non-image blocks) -->
    <BlockInsertModal
      v-if="blockModalOpen"
      :type="blockToInsert"
      @close="cancelBlockModal"
      @insert="onBlockInserted"
    />

    <!-- Block sample preview modal — opened by the "Sample" button next to Insert -->
    <BlockSampleModal
      v-if="sampleModalOpen"
      :type="blockToInsert"
      @close="sampleModalOpen = false"
      @insert="onSampleInserted"
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
import { computed, reactive, ref, watch, nextTick, onMounted } from 'vue'
import MediaPicker from '~/components/admin/MediaPicker.vue'
import BlockInsertModal from '~/components/admin/BlockInsertModal.vue'
import BlockSampleModal from '~/components/admin/BlockSampleModal.vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import CategorySelect from '~/components/admin/CategorySelect.vue'
import { ROW_LAYOUTS } from '~~/shared/blocks/registry.js'

type Mode = 'admin' | 'author'

const props = defineProps<{
  contentType: 'post' | 'page'
  id?: string | null   // null/undefined = create-new
  mode?: Mode          // default 'admin'
}>()

const emit = defineEmits<{
  saved: [id: string]   // emitted after successful create/update; parent navigates
  deleted: []
  cancel: []
}>()

const mode = computed<Mode>(() => props.mode || 'admin')
const isAdmin = computed(() => mode.value === 'admin')
const isAuthor = computed(() => mode.value === 'author')
const isPost = computed(() => props.contentType === 'post')
const isPage = computed(() => props.contentType === 'page')
const isNewMode = computed(() => !props.id)

const markdownPlaceholder = computed(() =>
  isPost.value
    ? '본문을 Markdown으로 작성하세요. 오른쪽의 Block 선택으로 :::custom block::: 을 삽입할 수 있습니다.'
    : '페이지 본문을 Markdown으로 작성하세요.',
)

// ── Constants ────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string; parentId: string | null; order: number }
type CategoryRow = Category & { depth: number }
type Tag = { id: string; name: string; slug: string; usageCount: number }
type MediaItem = { id: string; paths: { original: string } }

type PostListItem = {
  id: string; title: string; slug: string; status: string; updatedAt: string
  meta?: { featured?: boolean }
}
type PostDetail = PostListItem & {
  summary: string; markdown: string
  categoryIds: string[]; tagIds: string[]; thumbnailImageId: string | null
}

type PageListItem = {
  id: string; title: string; slug: string; status: string; updatedAt: string
  meta?: { parentId?: string | null; template?: string; showInMenu?: boolean }
}
type PageDetail = PageListItem & {
  summary: string; markdown: string; thumbnailImageId: string | null
}

const BLOCK_OPTIONS = [
  { value: 'title', label: 'Title Banner / Hero (배너)' },
  { value: 'notice', label: 'Notice (공지)' },
  { value: 'highlight', label: 'Highlight (강조)' },
  { value: 'quote', label: 'Quote (인용)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'button', label: 'Button' },
  { value: 'image', label: 'Image (single)' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'imageGrid', label: 'Image Grid' },
  { value: 'slide', label: 'Slide' },
  { value: 'file', label: 'File' },
  { value: 'map', label: 'Map' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'textCard', label: 'Text Card Grid' },
  { value: 'heroCards', label: 'Hero + Cards' },
  { value: 'iconList', label: 'Icon List' },
  { value: 'mediaText', label: 'Media + Text (alternating)' },
  { value: 'tabs', label: 'Tabs' },
  { value: 'postList', label: 'Post List (categories / tags)' },
]

// 사이트 전용 커스텀 블록 — 일반 블록과 별도 UI 섹션에 표시
const CUSTOM_BLOCK_OPTIONS = [
  { value: 'insuranceCalculator', label: '보험료 계산기',    site: 'insure' },
  { value: 'insurancePlanning',   label: '보험 설계 제안서', site: 'insure' },
]

const TEMPLATE_OPTIONS = [
  { value: 'page-basic', label: 'Basic (기본)' },
  { value: 'page-landing', label: 'Landing (랜딩)' },
  { value: 'page-about', label: 'About (소개)' },
]

const IMAGE_BLOCKS = new Set(['gallery', 'imageGrid', 'slide'])

const TIMELINE_PLACEHOLDER = [
  { date: 'MONTH - YEAR', title: 'Add a short title for the timeline event', description: 'Briefly describe the timeline event providing your audience with all the details they need to know about it.', imageId: '' },
  { date: 'MONTH - YEAR', title: 'Add a short title for the timeline event', description: 'Briefly describe the timeline event.', imageId: '' },
]
const TEXTCARD_PLACEHOLDER = [
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
]
const HEROCARDS_PLACEHOLDER = [
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
  { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
]
const ICONLIST_PLACEHOLDER = [
  { icon: 'ⓘ', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
  { icon: '⏱', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
  { icon: '🔊', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
  { icon: '★', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
  { icon: '◆', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
  { icon: '✓', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item. Remember to let your readers know why this list item is essential.' },
]
const TABS_PLACEHOLDER = [
  {
    label: 'Tab name',
    title: 'Type a brief and clear title for this panel.',
    content: 'Write a short descriptive paragraph about your tab that will help users find what they are looking for and get access to content without further exploration.\n\n**Featured subhead**\n\n- Add a single and succinct list item\n- Add a single and succinct list item\n- Add a single and succinct list item',
  },
  { label: 'Tab name', title: 'Second panel title', content: 'Second panel body — markdown supported.' },
  { label: 'Tab name', title: 'Third panel title', content: 'Third panel body — markdown supported.' },
]
const MEDIATEXT_PLACEHOLDER = [
  {
    imageId: '',
    title: 'Add a descriptive title for the column.',
    description: 'Use this space to add a medium length description. Be brief and give enough information to earn their attention.',
    list: ['Add a list item', 'Add a list item', 'Add a list item'],
  },
  {
    imageId: '',
    title: 'Add a descriptive title for the column.',
    description: 'Use this space to add a medium length description. Be brief and give enough information to earn their attention.',
    list: ['Add a list item', 'Add a list item', 'Add a list item'],
  },
]
const TEXT_TEMPLATES: Record<string, string> = {
  timeline: `:::timeline\nitems: ${JSON.stringify(TIMELINE_PLACEHOLDER)}\n:::`,
  textCard: `:::textCard\ncolumns: 3\ngap: medium\nbackgroundColor: #5d7e8d\ntextColor: light\nitems: ${JSON.stringify(TEXTCARD_PLACEHOLDER)}\n:::`,
  heroCards: `:::heroCards\neyebrow: ADD AN OVERLINE TEXT\ntitle: Briefly and concisely explain what you do for your audience.\nalign: left\nheight: large\ntextColor: light\ncardColumns: 3\ncardGap: medium\ncardOverlap: on\ncards: ${JSON.stringify(HEROCARDS_PLACEHOLDER)}\n:::`,
  iconList: `:::iconList\ncolumns: 2\ngap: medium\niconColor: #3d7e7c\niconTextColor: light\nitems: ${JSON.stringify(ICONLIST_PLACEHOLDER)}\n:::`,
  mediaText: `:::mediaText\nimageFrame: soft\nframeColor: #d8efe5\nalternate: on\nimagePosition: left\ngap: large\nitems: ${JSON.stringify(MEDIATEXT_PLACEHOLDER)}\n:::`,
  tabs: `:::tabs\nitems: ${JSON.stringify(TABS_PLACEHOLDER)}\n:::`,
  // ── 커스텀 블록 ──
  insuranceCalculator: `:::insuranceCalculator\ntitle: 보험료 계산기\nsubtitle: 간단한 정보 입력만으로 예상 보험료를 확인하세요.\ndefaultAge: 30\ndefaultType: life\n:::`,
  insurancePlanning: `:::insurancePlanning\nid: 레코드ID를_입력하세요\n:::`,
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

// ── Runtime config + API base ────────────────────────────────────────────────

const { activeSiteId } = useSiteAdmin()
const apiBase = useApiBase()

// /api/admin/contents vs /api/me/contents (Stage 2 endpoint)
const apiContentsBase = computed(() =>
  mode.value === 'author' ? `${apiBase}/api/me/contents` : `${apiBase}/api/admin/contents`,
)
const siteQuery = computed(() =>
  mode.value === 'admin' ? `?siteId=${encodeURIComponent(activeSiteId.value || '')}` : '',
)

// ── State ────────────────────────────────────────────────────────────────────

const isSaving = ref(false)
const isDeleting = ref(false)
const isError = ref(false)
const message = ref('')

const customBlockToInsert = ref('')
const markdownRef = ref<HTMLTextAreaElement | null>(null)
const featuredFileRef = ref<HTMLInputElement | null>(null)
const featuredUploading = ref(false)
const featuredError = ref('')
const featuredImageUrl = ref('')
const isDraggingOver = ref(false)
const featuredPickerOpen = ref(false)
const blockToInsert = ref('')
const pickerOpen = ref(false)
const pickerCursor = ref(0)
const blockModalOpen = ref(false)
const blockModalCursor = ref(0)
const sampleModalOpen = ref(false)
const sampleModalCursor = ref(0)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  markdown: '',
  status: 'draft',
  thumbnailImageId: '',
  // shared meta — show the eyebrow line (categories / contentType label) above the title
  showEyebrow: true,
  // post-only
  categoryIds: [] as string[],
  tagNamesInput: '',
  featured: false,
  // page-only
  parentId: '',
  template: 'page-basic',
  showInMenu: false,
})

// ── Conditional fetches (admin-only: categories/tags/parent-options) ─────────
// All three only fire in admin mode; author mode skips them.

const categoryRows = ref<CategoryRow[]>([])

watch(
  [() => isAdmin.value, activeSiteId],
  async ([shouldFetch, siteId]) => {
    if (!shouldFetch) { categoryRows.value = []; return }
    // Even when activeSiteId is empty (single-site setups where the sites
    // collection isn't populated), the server falls back to DEFAULT_SITE_ID.
    try {
      const r = await $fetch<{ items: Category[] }>(
        `${apiBase}/api/admin/categories?siteId=${encodeURIComponent(siteId || '')}`,
        { credentials: 'include' },
      )
      const all = r.items ?? []
      const byParent: Record<string, Category[]> = {}
      for (const c of all) {
        const pid = c.parentId || ''
        if (!byParent[pid]) byParent[pid] = []
        byParent[pid].push(c)
      }
      for (const pid of Object.keys(byParent)) {
        byParent[pid].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
      }
      const rows: CategoryRow[] = []
      const visit = (pid: string, depth: number) => {
        for (const c of byParent[pid] || []) {
          rows.push({ ...c, depth })
          visit(c.id, depth + 1)
        }
      }
      visit('', 0)
      categoryRows.value = rows
    } catch {
      categoryRows.value = []
    }
  },
  { immediate: true },
)

const existingTagList = ref<Tag[]>([])

watch(
  [() => isAdmin.value && isPost.value, activeSiteId],
  async ([shouldFetch, siteId]) => {
    if (!shouldFetch) { existingTagList.value = []; return }
    try {
      const r = await $fetch<{ items: Tag[] }>(
        `${apiBase}/api/admin/tags?siteId=${encodeURIComponent(siteId || '')}`,
        { credentials: 'include' },
      )
      existingTagList.value = r.items ?? []
    } catch {
      existingTagList.value = []
    }
  },
  { immediate: true },
)

// ── Parent options (page + admin only) ───────────────────────────────────────

type ParentListItem = { id: string; title: string }
const parentOptions = ref<ParentListItem[]>([])

watch(
  [() => isPage.value && isAdmin.value, activeSiteId],
  async ([shouldFetch, siteId]) => {
    if (!shouldFetch) { parentOptions.value = []; return }
    try {
      const r = await $fetch<{ items: ParentListItem[] }>(
        `${apiBase}/api/admin/contents?siteId=${encodeURIComponent(siteId || '')}&type=page&limit=200`,
        { credentials: 'include' },
      )
      parentOptions.value = r.items ?? []
    } catch {
      parentOptions.value = []
    }
  },
  { immediate: true },
)

// ── Media (for featured image URL lookup) — endpoint differs by mode ─────────
// admin → /api/admin/media (siteId from x-admin-site / activeSiteId)
// author → /api/me/media   (siteId resolved from request host on the server)

const mediaListUrl = computed(() =>
  mode.value === 'author' ? `${apiBase}/api/me/media` : `${apiBase}/api/admin/media`,
)
const mediaUploadUrl = computed(() =>
  mode.value === 'author' ? `${apiBase}/api/me/media/upload` : `${apiBase}/api/admin/media/upload`,
)

const mediaList = ref<MediaItem[]>([])

watch(
  [mediaListUrl, activeSiteId],
  async ([url]) => {
    if (!url) { mediaList.value = []; return }
    // Both endpoints have server-side siteId fallbacks (admin → DEFAULT_SITE_ID,
    // author → resolvePublicSiteId from x-site-host), so we don't gate on activeSiteId.
    try {
      const r = await $fetch<{ items: MediaItem[] }>(url, { credentials: 'include' })
      mediaList.value = r.items ?? []
    } catch {
      mediaList.value = []
    }
  },
  { immediate: true },
)

const mediaMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const item of mediaList.value) m[item.id] = item.paths?.original || ''
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
  // For new content: always mirror the slug from the title.
  // For existing content: keep the saved (and unique-resolved) slug intact.
  if (isNewMode.value) form.slug = nameToSlug(form.title)
}


function parseTagNames(input: string): string[] {
  return [...new Set(input.split(',').map(s => s.trim()).filter(Boolean))]
}

function addTagName(name: string) {
  const current = parseTagNames(form.tagNamesInput)
  if (current.includes(name)) return
  current.push(name)
  form.tagNamesInput = current.join(', ')
}

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

function insertCustomBlock() {
  const key = customBlockToInsert.value
  if (!key) return
  const ta = markdownRef.value
  const cursor = ta?.selectionStart ?? form.markdown.length
  if (ta) ta.setSelectionRange(cursor, cursor)
  insertAtCursor(TEXT_TEMPLATES[key] ?? `:::${key}\n:::`)
  customBlockToInsert.value = ''
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

function openSamplePreview() {
  if (!blockToInsert.value) return
  const ta = markdownRef.value
  sampleModalCursor.value = ta?.selectionStart ?? form.markdown.length
  sampleModalOpen.value = true
}

function onSampleInserted(markdown: string) {
  sampleModalOpen.value = false
  const ta = markdownRef.value
  if (ta) ta.setSelectionRange(sampleModalCursor.value, sampleModalCursor.value)
  insertAtCursor(markdown)
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

// ── Preview ──────────────────────────────────────────────────────────────────

type PreviewResult = {
  blocks: Array<{ type: string; props: Record<string, unknown> }>
  mediaMap: Record<string, { paths?: { original?: string }; title?: string; alt?: string }>
  errors: string[]
}

const previewOpen = ref(false)
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
      `${apiContentsBase.value}/preview${siteQuery.value}`,
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

// ── Featured image upload (drop + file input share the same upload core) ─────

async function uploadFeaturedFile(file: File) {
  if (!file || !file.type.startsWith('image/')) {
    featuredError.value = '이미지 파일만 업로드할 수 있습니다.'
    return
  }
  featuredError.value = ''
  featuredUploading.value = true
  try {
    const formData = new FormData()
    formData.append('files', file)
    const headers: Record<string, string> = {}
    if (mode.value === 'admin' && activeSiteId.value) {
      headers['x-admin-site'] = activeSiteId.value
    }
    const result = await $fetch<{ items: Array<{ id: string; paths: { original: string } }> }>(
      mediaUploadUrl.value,
      { method: 'POST', credentials: 'include', headers, body: formData },
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

async function onFeaturedFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  input.value = ''
  await uploadFeaturedFile(file)
}

async function onFeaturedDrop(event: DragEvent) {
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await uploadFeaturedFile(file)
}

function clearFeaturedImage() {
  form.thumbnailImageId = ''
  featuredImageUrl.value = ''
}

// Click on the featured slot — admin opens the Media picker (selects from the
// existing library), author falls back to the file input (no admin media access).
function onFeaturedClick() {
  if (isAdmin.value) {
    featuredPickerOpen.value = true
  } else {
    featuredFileRef.value?.click()
  }
}

function onFeaturedPickerPick(ids: string[]) {
  featuredPickerOpen.value = false
  if (!ids.length) return
  form.thumbnailImageId = ids[0]
  // featuredImageUrl auto-updates via the existing [thumbnailImageId, mediaMap] watcher.
}

// ── Load detail when editing ─────────────────────────────────────────────────

async function loadDetail() {
  if (!props.id) return
  try {
    // Admin + post: fetch detail + tag list in parallel so we can map server-side
    // tagIds to names without racing against the categories/tags watchers.
    // Author mode: /api/me/contents/[id] response includes tagNames directly.
    const needAdminTags = isPost.value && isAdmin.value && !!activeSiteId.value
    const [detail, tagsRes] = await Promise.all([
      $fetch<{ content: (PostDetail | PageDetail) & { tagNames?: string[] } }>(
        `${apiContentsBase.value}/${props.id}${siteQuery.value}`,
        { credentials: 'include' },
      ),
      needAdminTags
        ? $fetch<{ items: Tag[] }>(
            `${apiBase}/api/admin/tags?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
            { credentials: 'include' },
          )
        : Promise.resolve({ items: [] as Tag[] }),
    ])
    const c = detail.content as PostDetail & PageDetail & {
      meta?: PageListItem['meta'] & PostListItem['meta'] & { showEyebrow?: boolean }
      tagNames?: string[]
    }
    form.title = c.title || ''
    form.slug = c.slug || ''
    form.excerpt = c.summary || ''
    form.markdown = c.markdown || ''
    form.thumbnailImageId = c.thumbnailImageId ? String(c.thumbnailImageId) : ''
    form.status = c.status || 'draft'
    form.categoryIds = (c.categoryIds || []).map(String)
    // showEyebrow defaults to true when meta is missing the field (preserves
    // existing posts' eyebrow visibility before this toggle existed).
    form.showEyebrow = c.meta?.showEyebrow !== false

    if (isPost.value) {
      let tagNames: string[]
      if (Array.isArray(c.tagNames)) {
        // Server already resolved tag names (author response, or future enriched admin).
        tagNames = c.tagNames
      } else {
        const tagIdSet = new Set((c.tagIds || []).map(String))
        tagNames = (tagsRes.items || []).filter(t => tagIdSet.has(t.id)).map(t => t.name)
      }
      form.tagNamesInput = tagNames.join(', ')
      form.featured = !!(c.meta?.featured)
    } else {
      form.parentId = c.meta?.parentId ? String(c.meta.parentId) : ''
      form.template = c.meta?.template || 'page-basic'
      form.showInMenu = !!c.meta?.showInMenu
    }
  } catch {
    isError.value = true
    message.value = isPost.value ? '글을 불러오지 못했습니다.' : '페이지를 불러오지 못했습니다.'
  }
}

// Load detail on mount. Both admin and author API endpoints have server-side
// siteId fallbacks (DEFAULT_SITE_ID / x-site-host), so we don't need to wait
// for useSiteAdmin's activeSiteId to populate before fetching.
onMounted(async () => {
  if (!props.id) return
  await loadDetail()
})

// ── Save / delete ────────────────────────────────────────────────────────────

function buildSaveBody(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    contentType: props.contentType,
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    summary: form.excerpt.trim(),
    markdown: form.markdown,
    thumbnailImageId: form.thumbnailImageId || null,
  }
  if (isPost.value) {
    base.tagNames = parseTagNames(form.tagNamesInput)
  }
  if (isAdmin.value) {
    base.status = form.status
    base.categoryIds = form.categoryIds   // both posts and pages
    if (isPost.value) {
      base.featured = form.featured
      // For posts the admin handler merges input.meta with the `featured` flag —
      // so showEyebrow flows through that merge into the stored meta.
      base.meta = { showEyebrow: form.showEyebrow }
    } else {
      base.meta = {
        parentId: form.parentId || null,
        template: form.template,
        showInMenu: form.showInMenu,
        showEyebrow: form.showEyebrow,
      }
    }
  }
  return base
}

async function save() {
  if (!form.title.trim()) {
    isError.value = true
    message.value = '제목을 입력해주세요.'
    return
  }
  message.value = ''
  isError.value = false
  isSaving.value = true
  try {
    const body = buildSaveBody()
    let result: { content: { id: string; slug: string } }
    if (isNewMode.value) {
      result = await $fetch(
        `${apiContentsBase.value}${siteQuery.value}`,
        { method: 'POST', credentials: 'include', body },
      )
      message.value = isPost.value ? '글이 생성되었습니다.' : '페이지가 생성되었습니다.'
    } else {
      result = await $fetch(
        `${apiContentsBase.value}/${props.id}${siteQuery.value}`,
        { method: 'PUT', credentials: 'include', body },
      )
      form.slug = result.content.slug
      message.value = '저장되었습니다.'
    }
    emit('saved', result.content.id)
    setTimeout(() => { message.value = '' }, 2200)
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!props.id || isDeleting.value) return
  if (!isAdmin.value) return  // safety: author cannot delete
  const label = isPost.value ? '글' : '페이지'
  if (!window.confirm(`'${form.title}' ${label}을(를) 삭제할까요?`)) return
  message.value = ''
  isError.value = false
  isDeleting.value = true
  try {
    await $fetch(
      `${apiContentsBase.value}/${props.id}${siteQuery.value}`,
      { method: 'DELETE', credentials: 'include' },
    )
    emit('deleted')
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '삭제에 실패했습니다.'
  } finally {
    isDeleting.value = false
  }
}

function onCancel() {
  emit('cancel')
}
</script>
