<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Categories."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="categories" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <h1>Categories.</h1>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ categoryList.length }} categories</span>
            <button type="button" class="theme-form-submit" @click="openNew">+ New Category</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading categories...</div>

        <section v-else-if="!categoryList.length" class="theme-backend-state">
          등록된 카테고리가 없습니다.
        </section>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Order</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in sortedRows"
                :key="row.id"
                :class="{ current: drawerId === row.id && drawerOpen }"
                @click="openEdit(row)"
              >
                <td>
                  <span :style="{ paddingLeft: `${row.depth * 16}px` }">
                    <span v-if="row.depth > 0" class="theme-meta" style="margin-right:6px">└</span>
                    <strong>{{ row.name }}</strong>
                  </span>
                </td>
                <td><code class="theme-backend-content-slug">{{ row.slug }}</code></td>
                <td>{{ parentNameMap[row.parentId || ''] || '—' }}</td>
                <td class="theme-meta">{{ row.order ?? 0 }}</td>
                <td class="theme-meta">{{ formatDate(row.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>

    <!-- ── Drawer ── -->
    <div v-if="drawerOpen" class="theme-backend-user-modal" @click="closeDrawer">
      <div class="theme-backend-user-drawer theme-backend-sites-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>{{ isNewMode ? 'New Category' : form.name || 'Category' }}</strong>
          <button type="button" class="theme-backend-close" aria-label="Close" @click="closeDrawer">×</button>
        </div>

        <form class="theme-backend-form" @submit.prevent="saveCategory">
          <div class="theme-backend-form-grid">
            <label class="theme-form-field">
              <span>Name</span>
              <input
                v-model="form.name"
                required
                maxlength="60"
                placeholder="공지사항"
                @input="onNameInput"
              />
            </label>

            <label class="theme-form-field">
              <span>Slug</span>
              <input
                v-model="form.slug"
                maxlength="80"
                placeholder="자동 생성"
              />
            </label>

            <label class="theme-form-field">
              <span>Parent</span>
              <select v-model="form.parentId">
                <option value="">— 없음 —</option>
                <option
                  v-for="opt in parentOptions"
                  :key="opt.id"
                  :value="opt.id"
                  :disabled="!isNewMode && opt.id === drawerId"
                >
                  {{ '— '.repeat(opt.depth) }}{{ opt.name }}
                </option>
              </select>
            </label>

            <label class="theme-form-field">
              <span>Order</span>
              <input v-model.number="form.order" type="number" min="0" max="9999" />
            </label>
          </div>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="theme-backend-actions" :style="!isNewMode ? 'justify-content: space-between' : ''">
            <button
              v-if="!isNewMode"
              type="button"
              class="theme-form-submit theme-form-submit-warning"
              :disabled="isSaving || isDeleting"
              @click="deleteCategoryItem"
            >
              {{ isDeleting ? '삭제 중...' : '삭제' }}
            </button>
            <button class="theme-form-submit" type="submit" :disabled="isSaving || isDeleting">
              {{ isSaving ? 'Saving...' : (isNewMode ? '카테고리 생성' : '저장') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({ layout: 'default' })

type Category = {
  id: string
  name: string
  slug: string
  parentId: string | null
  order: number
  updatedAt: string
}

type CategoryRow = Category & { depth: number }

const { navItems } = useBackendMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const drawerOpen = ref(false)
const isNewMode = ref(false)
const drawerId = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const message = ref('')
const isError = ref(false)
const slugDirty = ref(false)

const form = reactive({
  name: '',
  slug: '',
  parentId: '',
  order: 0,
})

const listUrl = `${apiBase}/api/admin/categories`

const { data, pending, refresh } = useFetch<{ items: Category[] }>(
  listUrl,
  {
    key: 'admin-categories',
    credentials: 'include',
    server: false,
    default: () => ({ items: [] }),
  },
)

const categoryList = computed<Category[]>(() => data.value?.items ?? [])
const parentNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const c of categoryList.value) map[c.id] = c.name
  return map
})

// Build hierarchical depth and sort: parents first, then children grouped under them
const sortedRows = computed<CategoryRow[]>(() => {
  const byParent: Record<string, Category[]> = {}
  for (const c of categoryList.value) {
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
  return rows
})

const parentOptions = computed(() => sortedRows.value)

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function resetForm() {
  form.name = ''
  form.slug = ''
  form.parentId = ''
  form.order = 0
  slugDirty.value = false
  message.value = ''
  isError.value = false
}

function openNew() {
  isNewMode.value = true
  drawerId.value = ''
  resetForm()
  drawerOpen.value = true
}

function openEdit(row: Category) {
  isNewMode.value = false
  drawerId.value = row.id
  form.name = row.name
  form.slug = row.slug
  form.parentId = row.parentId || ''
  form.order = row.order ?? 0
  slugDirty.value = true
  message.value = ''
  isError.value = false
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function onNameInput() {
  if (!isNewMode.value || slugDirty.value) return
  // Auto-suggest slug from name in new mode while user hasn't manually edited slug
  const slug = form.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣ᄀ-ᇿ㄰-㆏-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  form.slug = slug
}

watch(() => form.slug, (v, old) => {
  if (isNewMode.value && v !== old && document.activeElement instanceof HTMLInputElement) {
    slugDirty.value = true
  }
})

async function saveCategory() {
  message.value = ''
  isError.value = false
  isSaving.value = true
  try {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parentId: form.parentId || null,
      order: Number(form.order) || 0,
    }
    if (isNewMode.value) {
      const result = await $fetch<{ item: Category }>(
        `${apiBase}/api/admin/categories`,
        { method: 'POST', credentials: 'include', body },
      )
      await refresh()
      isNewMode.value = false
      drawerId.value = result.item.id
      form.slug = result.item.slug
      message.value = '카테고리가 생성되었습니다.'
    } else {
      const result = await $fetch<{ item: Category }>(
        `${apiBase}/api/admin/categories/${drawerId.value}`,
        { method: 'PUT', credentials: 'include', body },
      )
      await refresh()
      form.slug = result.item.slug
      message.value = '저장되었습니다.'
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

async function deleteCategoryItem() {
  if (!drawerId.value || isDeleting.value) return
  if (!window.confirm(`'${form.name}' 카테고리를 삭제할까요?`)) return
  message.value = ''
  isError.value = false
  isDeleting.value = true
  try {
    await $fetch(
      `${apiBase}/api/admin/categories/${drawerId.value}`,
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
