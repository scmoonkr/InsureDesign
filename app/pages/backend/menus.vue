<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Menus."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="menus" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <div class="theme-backend-contents-head-left">
            <h1>Menus.</h1>
            <div class="theme-backend-contents-filters">
              <select v-model="selectedMenuId" name="menuSelect">
                <option value="">— 새 메뉴 만들기 —</option>
                <option v-for="m in menusList" :key="m.id" :value="m.id">
                  {{ m.name }} ({{ m.location }})
                </option>
              </select>
            </div>
          </div>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ menusList.length }} menus</span>
            <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="resetForNew">+ 새 메뉴</button>
          </div>
        </div>

        <p v-if="message" :class="['theme-form-status', { error: isError }]" style="margin: 8px 0 12px;">{{ message }}</p>

        <section class="menus-grid">
          <!-- ── LEFT: Sources ── -->
          <aside class="menus-sources">
            <h2 class="menus-pane-head">메뉴 항목 추가</h2>

            <details class="menus-source-box" open>
              <summary>페이지</summary>
              <div class="menus-source-body">
                <ul v-if="pageSources.length" class="menus-source-list">
                  <li v-for="p in pageSources" :key="p.id">
                    <label>
                      <input type="checkbox" :value="p.id" v-model="pickedPageIds" />
                      <span>{{ p.title }}</span>
                    </label>
                  </li>
                </ul>
                <p v-else class="theme-meta">등록된 페이지가 없습니다.</p>
                <button
                  type="button"
                  class="theme-form-submit theme-form-submit-secondary-soft"
                  :disabled="!pickedPageIds.length"
                  @click="addPages"
                >메뉴에 추가</button>
              </div>
            </details>

            <details class="menus-source-box">
              <summary>글</summary>
              <div class="menus-source-body">
                <ul v-if="postSources.length" class="menus-source-list">
                  <li v-for="p in postSources" :key="p.id">
                    <label>
                      <input type="checkbox" :value="p.id" v-model="pickedPostIds" />
                      <span>{{ p.title }}</span>
                    </label>
                  </li>
                </ul>
                <p v-else class="theme-meta">등록된 글이 없습니다.</p>
                <button
                  type="button"
                  class="theme-form-submit theme-form-submit-secondary-soft"
                  :disabled="!pickedPostIds.length"
                  @click="addPosts"
                >메뉴에 추가</button>
              </div>
            </details>

            <details class="menus-source-box">
              <summary>사용자 정의 링크</summary>
              <div class="menus-source-body">
                <label class="theme-form-field">
                  <span>URL <em class="theme-meta" style="font-style:normal">(선택)</em></span>
                  <input v-model="customUrl" type="text" placeholder="https://example.com 또는 /about — 비워두면 대표메뉴" />
                </label>
                <label class="theme-form-field">
                  <span>링크 이름</span>
                  <input v-model="customLabel" type="text" maxlength="100" placeholder="표시 텍스트" />
                </label>
                <p class="theme-meta" style="margin:0;font-size:11px;line-height:1.5">
                  URL을 비우면 클릭되지 않는 **대표메뉴(섹션 헤더)**로 추가됩니다. 하위 항목을 묶을 때 사용하세요.
                </p>
                <button
                  type="button"
                  class="theme-form-submit theme-form-submit-secondary-soft"
                  :disabled="!customLabel"
                  @click="addCustomLink"
                >메뉴에 추가</button>
              </div>
            </details>

            <details class="menus-source-box">
              <summary>카테고리</summary>
              <div class="menus-source-body">
                <ul v-if="categorySources.length" class="menus-source-list">
                  <li v-for="c in categorySources" :key="c.id">
                    <label>
                      <input type="checkbox" :value="c.id" v-model="pickedCategoryIds" />
                      <span>{{ c.name }}</span>
                    </label>
                  </li>
                </ul>
                <p v-else class="theme-meta">등록된 카테고리가 없습니다.</p>
                <button
                  type="button"
                  class="theme-form-submit theme-form-submit-secondary-soft"
                  :disabled="!pickedCategoryIds.length"
                  @click="addCategories"
                >메뉴에 추가</button>
              </div>
            </details>
          </aside>

          <!-- ── RIGHT: Structure ── -->
          <section class="menus-structure">
            <h2 class="menus-pane-head">메뉴 구조</h2>

            <div class="menus-meta">
              <label class="theme-form-field">
                <span>메뉴 이름</span>
                <input v-model="form.name" maxlength="100" placeholder="예: Header Primary" />
              </label>
              <label class="theme-form-field">
                <span>위치</span>
                <select v-model="form.location">
                  <option value="header">header</option>
                  <option value="footer">footer</option>
                  <option value="sidebar">sidebar</option>
                  <option value="custom">custom</option>
                </select>
              </label>
            </div>

            <p class="theme-meta menus-help">
              항목을 순서대로 정렬하세요. 항목의 화살표를 누르면 추가 설정이 보입니다.
            </p>

            <ul v-if="form.items.length" class="menus-items">
              <li
                v-for="(item, i) in form.items"
                :key="item.id"
                :class="['menus-item', { 'menus-item-child': depthOf(item) > 0 }]"
                :style="{ marginLeft: `${depthOf(item) * 28}px` }"
              >
                <header
                  class="menus-item-head"
                  @click="toggleExpand(item.id)"
                >
                  <span v-if="depthOf(item) > 0" class="theme-meta menus-item-depth-marker">└</span>
                  <strong class="menus-item-title">{{ item.title || '(이름 없음)' }}</strong>
                  <span v-if="depthOf(item) > 0" class="menus-item-sub-badge">하위</span>
                  <span v-if="isHeaderOnly(item)" class="menus-item-header-badge">대표</span>
                  <span class="menus-item-type">{{ typeLabel(item.type) }}</span>
                  <span class="menus-item-toggle">{{ expandedItemId === item.id ? '▲' : '▼' }}</span>
                </header>

                <div v-if="expandedItemId === item.id" class="menus-item-detail">
                  <label class="theme-form-field">
                    <span>표시 이름</span>
                    <input v-model="item.title" maxlength="200" />
                  </label>

                  <label v-if="item.type === 'url'" class="theme-form-field">
                    <span>URL <em class="theme-meta" style="font-style:normal">(선택 — 비우면 대표메뉴)</em></span>
                    <input v-model="item.url" type="text" placeholder="비워두면 클릭 불가" />
                  </label>

                  <div class="menus-item-row">
                    <label class="theme-form-field">
                      <span>새 창</span>
                      <select v-model="item.target">
                        <option value="self">같은 창</option>
                        <option value="blank">새 창</option>
                      </select>
                    </label>
                    <label class="theme-form-field">
                      <span>표시</span>
                      <label class="theme-backend-posts-check" style="padding:8px 0 0">
                        <input type="checkbox" v-model="item.isVisible" />
                        <span>메뉴에 노출</span>
                      </label>
                    </label>
                  </div>

                  <div class="menus-item-actions">
                    <button type="button" :disabled="i === 0" @click="moveUp(i)">↑ 위로</button>
                    <button type="button" :disabled="i === form.items.length - 1" @click="moveDown(i)">아래로 ↓</button>
                    <button type="button" :disabled="!canIndent(i)" @click="indent(i)">→ 하위로</button>
                    <button type="button" :disabled="!canOutdent(i)" @click="outdent(i)">← 상위로</button>
                    <button type="button" class="warning" @click="removeItem(i)">삭제</button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-else class="theme-backend-state">메뉴 항목이 없습니다. 왼쪽에서 추가하세요.</p>

            <footer class="menus-actions">
              <button
                type="button"
                class="theme-form-submit"
                :disabled="isSaving"
                @click="saveMenu"
              >{{ isSaving ? '저장 중...' : (selectedMenuId ? '저장' : '메뉴 생성') }}</button>
              <button
                v-if="selectedMenuId"
                type="button"
                class="theme-form-submit theme-form-submit-secondary-soft"
                :disabled="isSaving"
                title="이 메뉴를 복사해서 새 메뉴로 (예: header → footer)"
                @click="duplicateMenu"
              >복사</button>
              <button
                v-if="selectedMenuId"
                type="button"
                class="theme-form-submit theme-form-submit-warning"
                :disabled="isSaving"
                @click="deleteCurrentMenu"
              >메뉴 삭제</button>
            </footer>
          </section>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({ layout: 'default' })

type MenuItem = {
  id: string
  title: string
  type: 'page' | 'post' | 'category' | 'url'
  contentId?: string | null
  categoryId?: string | null
  url?: string
  target: 'self' | 'blank'
  isVisible: boolean
  order: number
  children?: MenuItem[]
}

// Internal editing representation — flat array with parentItemId.
// Converted to nested `children[]` on save, and from nested on load.
type FlatItem = Omit<MenuItem, 'children'> & { parentItemId: string | null }

function flattenItems(items: MenuItem[], parentId: string | null = null): FlatItem[] {
  const out: FlatItem[] = []
  for (const it of items) {
    const { children, ...rest } = it
    out.push({ ...rest, parentItemId: parentId })
    if (children?.length) out.push(...flattenItems(children, it.id))
  }
  return out
}

function nestItems(flat: FlatItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>()
  for (const it of flat) {
    const { parentItemId, ...rest } = it
    map.set(it.id, { ...rest, children: [] })
  }
  const roots: MenuItem[] = []
  for (const it of flat) {
    const node = map.get(it.id)!
    if (it.parentItemId && map.has(it.parentItemId)) {
      map.get(it.parentItemId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function depthOf(item: FlatItem): number {
  return item.parentItemId ? 1 : 0
}

type Menu = {
  id: string
  name: string
  location: string
  items: MenuItem[]
}

type ContentRef = { id: string; title: string; slug: string }
type CategoryRef = { id: string; name: string; slug: string }

const TYPE_LABEL: Record<string, string> = {
  page: '페이지',
  post: '글',
  category: '카테고리',
  url: '사용자 정의 링크',
}

function typeLabel(t: string) { return TYPE_LABEL[t] || t }

// "대표메뉴" — a custom-link item with no URL renders as a non-clickable label,
// useful as a group header. Public renderer should treat this as <span> not <a>.
function isHeaderOnly(item: FlatItem): boolean {
  return item.type === 'url' && !(item.url || '').trim()
}

const { navItems } = useBackendMenu()
const { activeSiteId } = useSiteAdmin()
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

const isSidebarOpen = ref(false)
const selectedMenuId = ref('')
const expandedItemId = ref('')
const isSaving = ref(false)
const message = ref('')
const isError = ref(false)

const form = reactive<{ name: string; location: string; items: FlatItem[] }>({
  name: '',
  location: 'header',
  items: [],
})

// ── List menus ───────────────────────────────────────────────────────────────

const menusUrl = computed(
  () => `${apiBase}/api/admin/menus?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
)
const { data: menusData, refresh: refreshMenus } = useFetch<{ items: Menu[] }>(menusUrl, {
  key: 'admin-menus',
  credentials: 'include',
  server: false,
  watch: [activeSiteId],
  default: () => ({ items: [] }),
})
const menusList = computed<Menu[]>(() => menusData.value?.items ?? [])

// When user selects a menu from the dropdown, populate the form
const isDuplicating = ref(false)

watch(selectedMenuId, (id) => {
  // duplicateMenu() flips selectedMenuId to '' for the "new" workflow but wants
  // to keep the just-cloned form data — skip the reset/load while it's running.
  if (isDuplicating.value) return
  if (!id) { resetForNew(); return }
  const m = menusList.value.find(x => x.id === id)
  if (!m) return
  form.name = m.name
  form.location = m.location
  form.items = flattenItems(JSON.parse(JSON.stringify(m.items || [])))
  expandedItemId.value = ''
})

// ── Source feeds ─────────────────────────────────────────────────────────────

const sourceParams = computed(() => `siteId=${encodeURIComponent(activeSiteId.value || '')}`)

const { data: pagesData } = useFetch<{ items: ContentRef[] }>(
  () => `${apiBase}/api/admin/contents?${sourceParams.value}&type=page&limit=50`,
  { key: 'menus-pages', credentials: 'include', server: false, watch: [activeSiteId], default: () => ({ items: [] }) },
)
const { data: postsData } = useFetch<{ items: ContentRef[] }>(
  () => `${apiBase}/api/admin/contents?${sourceParams.value}&type=post&limit=50`,
  { key: 'menus-posts', credentials: 'include', server: false, watch: [activeSiteId], default: () => ({ items: [] }) },
)
const { data: catsData } = useFetch<{ items: CategoryRef[] }>(
  () => `${apiBase}/api/admin/categories?${sourceParams.value}`,
  { key: 'menus-cats', credentials: 'include', server: false, watch: [activeSiteId], default: () => ({ items: [] }) },
)

const pageSources = computed<ContentRef[]>(() => pagesData.value?.items ?? [])
const postSources = computed<ContentRef[]>(() => postsData.value?.items ?? [])
const categorySources = computed<CategoryRef[]>(() => catsData.value?.items ?? [])

// ── Source picker state ──────────────────────────────────────────────────────

const pickedPageIds = ref<string[]>([])
const pickedPostIds = ref<string[]>([])
const pickedCategoryIds = ref<string[]>([])
const customUrl = ref('')
const customLabel = ref('')

function makeId() {
  try { return crypto.randomUUID() } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

function addPages() {
  for (const id of pickedPageIds.value) {
    const p = pageSources.value.find(x => x.id === id)
    if (!p) continue
    form.items.push({
      id: makeId(), title: p.title, type: 'page', contentId: p.id,
      target: 'self', isVisible: true, order: form.items.length, parentItemId: null,
    })
  }
  pickedPageIds.value = []
}

function addPosts() {
  for (const id of pickedPostIds.value) {
    const p = postSources.value.find(x => x.id === id)
    if (!p) continue
    form.items.push({
      id: makeId(), title: p.title, type: 'post', contentId: p.id,
      target: 'self', isVisible: true, order: form.items.length, parentItemId: null,
    })
  }
  pickedPostIds.value = []
}

function addCategories() {
  for (const id of pickedCategoryIds.value) {
    const c = categorySources.value.find(x => x.id === id)
    if (!c) continue
    form.items.push({
      id: makeId(), title: c.name, type: 'category', categoryId: c.id,
      target: 'self', isVisible: true, order: form.items.length, parentItemId: null,
    })
  }
  pickedCategoryIds.value = []
}

function addCustomLink() {
  // Allow URL-less items — they render as non-clickable section headers ("대표메뉴").
  if (!customLabel.value.trim()) return
  form.items.push({
    id: makeId(),
    title: customLabel.value.trim(),
    type: 'url',
    url: customUrl.value.trim(),  // may be ''
    target: 'self',
    isVisible: true,
    order: form.items.length,
    parentItemId: null,
  })
  customUrl.value = ''
  customLabel.value = ''
}

// ── Item manipulation ────────────────────────────────────────────────────────

function toggleExpand(id: string) {
  expandedItemId.value = expandedItemId.value === id ? '' : id
}

function moveUp(i: number) {
  if (i <= 0) return
  const [item] = form.items.splice(i, 1)
  form.items.splice(i - 1, 0, item)
}

function moveDown(i: number) {
  if (i >= form.items.length - 1) return
  const [item] = form.items.splice(i, 1)
  form.items.splice(i + 1, 0, item)
}

// Indent: top-level → child of the most recent preceding top-level item.
// Max depth is 2 (root + 1 child level), so depth-1 items cannot indent further.
function canIndent(i: number): boolean {
  if (i === 0) return false
  if (form.items[i].parentItemId) return false
  for (let j = i - 1; j >= 0; j--) {
    if (!form.items[j].parentItemId) return true
  }
  return false
}

function indent(i: number) {
  if (!canIndent(i)) return
  for (let j = i - 1; j >= 0; j--) {
    if (!form.items[j].parentItemId) {
      form.items[i].parentItemId = form.items[j].id
      return
    }
  }
}

function canOutdent(i: number): boolean {
  return !!form.items[i].parentItemId
}

function outdent(i: number) {
  if (!canOutdent(i)) return
  form.items[i].parentItemId = null
}

// Delete the item; if it was top-level, also delete its children to avoid
// orphans pointing at a missing parent.
function removeItem(i: number) {
  const it = form.items[i]
  if (expandedItemId.value === it.id) expandedItemId.value = ''
  const idsToRemove = new Set<string>([it.id])
  if (!it.parentItemId) {
    for (const child of form.items) {
      if (child.parentItemId === it.id) idsToRemove.add(child.id)
    }
  }
  form.items = form.items.filter(x => !idsToRemove.has(x.id))
}

// ── New / save / delete ──────────────────────────────────────────────────────

function resetForNew() {
  selectedMenuId.value = ''
  form.name = ''
  form.location = 'header'
  form.items = []
  expandedItemId.value = ''
  message.value = ''
  isError.value = false
}

// Duplicate the currently-loaded menu: clone every item with fresh IDs (and remap
// parentItemId references), append "(Copy)" to the name, flip the location to its
// counterpart (header ↔ footer) as a sensible default, and switch into the
// "new menu" workflow so saving will create a new record.
function duplicateMenu() {
  if (!selectedMenuId.value) return

  const idMap = new Map<string, string>()
  for (const item of form.items) idMap.set(item.id, makeId())
  const clonedItems: FlatItem[] = form.items.map(item => ({
    ...item,
    id: idMap.get(item.id)!,
    parentItemId: item.parentItemId ? (idMap.get(item.parentItemId) ?? null) : null,
  }))
  const newName = `${form.name || '메뉴'} (Copy)`
  const newLocation =
    form.location === 'header' ? 'footer'
    : form.location === 'footer' ? 'header'
    : form.location

  isDuplicating.value = true
  selectedMenuId.value = ''
  form.name = newName
  form.location = newLocation
  form.items = clonedItems
  expandedItemId.value = ''
  message.value = '복사본을 만들었습니다. 이름과 위치를 확인하고 "메뉴 생성"을 눌러 저장하세요.'
  isError.value = false
  // Release the guard on the next tick so the watcher resumes normal behavior
  // when the user picks a different menu later.
  nextTick(() => { isDuplicating.value = false })
}

async function saveMenu() {
  if (!form.name.trim()) {
    isError.value = true
    message.value = '메뉴 이름을 입력하세요.'
    return
  }
  message.value = ''
  isError.value = false
  isSaving.value = true
  try {
    const body = {
      name: form.name.trim(),
      location: form.location,
      items: nestItems(form.items),
    }
    if (selectedMenuId.value) {
      const result = await $fetch<{ menu: Menu }>(
        `${apiBase}/api/admin/menus/${selectedMenuId.value}?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
        { method: 'PUT', credentials: 'include', body },
      )
      await refreshMenus()
      form.items = flattenItems(JSON.parse(JSON.stringify(result.menu.items || [])))
      message.value = '메뉴가 저장되었습니다.'
    } else {
      const result = await $fetch<{ menu: Menu }>(
        `${apiBase}/api/admin/menus?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
        { method: 'POST', credentials: 'include', body },
      )
      await refreshMenus()
      selectedMenuId.value = result.menu.id
      message.value = '메뉴가 생성되었습니다.'
    }
    setTimeout(() => { message.value = '' }, 2200)
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function deleteCurrentMenu() {
  if (!selectedMenuId.value || isSaving.value) return
  if (!window.confirm(`'${form.name}' 메뉴를 삭제할까요?`)) return
  isSaving.value = true
  try {
    await $fetch(
      `${apiBase}/api/admin/menus/${selectedMenuId.value}?siteId=${encodeURIComponent(activeSiteId.value || '')}`,
      { method: 'DELETE', credentials: 'include' },
    )
    await refreshMenus()
    resetForNew()
    message.value = '메뉴가 삭제되었습니다.'
    setTimeout(() => { message.value = '' }, 2200)
  } catch (err: unknown) {
    isError.value = true
    const e = err as { data?: { error?: string }, message?: string }
    message.value = e?.data?.error || e?.message || '삭제에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.menus-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  margin-top: 16px;
  align-items: start;
}

.menus-pane-head {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ── Left: Source picker ── */
.menus-sources {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menus-source-box {
  border: 1px solid var(--theme-line);
  background: var(--theme-bg);
}
.menus-source-box > summary {
  list-style: none;
  cursor: pointer;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.menus-source-box > summary::after {
  content: '▼';
  font-size: 10px;
  color: var(--theme-fg-faint);
  transition: transform 0.15s ease;
}
.menus-source-box[open] > summary::after {
  transform: rotate(180deg);
}
.menus-source-box > summary::-webkit-details-marker { display: none; }

.menus-source-body {
  padding: 8px 14px 14px;
  border-top: 1px solid var(--theme-line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menus-source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menus-source-list label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 0;
}
.menus-source-list input[type="checkbox"] { width: 14px; height: 14px; }

/* ── Right: Structure ── */
.menus-structure {
  background: var(--theme-bg);
  border: 1px solid var(--theme-line);
  padding: 18px 22px 22px;
}

.menus-meta {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--theme-line);
}

.menus-help {
  margin: 0 0 14px;
  font-size: 12px;
}

.menus-items {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menus-item {
  border: 1px solid var(--theme-line);
  background: var(--theme-bg-soft);
}

.menus-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}
.menus-item-head:hover {
  background: var(--theme-bg);
}

.menus-item-title {
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menus-item-type {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--theme-fg-faint);
  text-transform: uppercase;
}
.menus-item-toggle {
  font-size: 10px;
  color: var(--theme-fg-dim);
}

.menus-item-child {
  background: var(--theme-bg);
  border-left: 3px solid var(--theme-fg-dim);
}
.menus-item-depth-marker {
  margin-right: 4px;
}
.menus-item-sub-badge {
  padding: 1px 6px;
  font-size: 10px;
  letter-spacing: 0.1em;
  background: var(--theme-bg-soft);
  color: var(--theme-fg-dim);
  border-radius: 3px;
}
.menus-item-header-badge {
  padding: 1px 6px;
  font-size: 10px;
  letter-spacing: 0.1em;
  background: var(--theme-fg);
  color: var(--theme-bg);
  border-radius: 3px;
}

.menus-item-detail {
  padding: 14px;
  background: var(--theme-bg);
  border-top: 1px solid var(--theme-line);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menus-item-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: end;
}

.menus-item-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px dashed var(--theme-line);
}
.menus-item-actions button {
  padding: 6px 12px;
  border: 1px solid var(--theme-line);
  background: var(--theme-bg);
  font-size: 12px;
  cursor: pointer;
}
.menus-item-actions button:hover:not(:disabled) {
  border-color: var(--theme-fg-dim);
}
.menus-item-actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.menus-item-actions .warning {
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.4);
  margin-left: auto;
}
.menus-item-actions .warning:hover:not(:disabled) {
  border-color: #EF4444;
  background: rgba(239, 68, 68, 0.06);
}

.menus-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--theme-line);
}

/* Mobile */
@media (max-width: 920px) {
  .menus-grid {
    grid-template-columns: 1fr;
  }
}
</style>
