<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="media" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-media-head">
          <div class="theme-backend-media-head-left">
            <h1>미디어 라이브러리</h1>
            <button type="button" class="theme-form-submit" @click="toggleDropzone">미디어 파일 추가</button>
            <input
              ref="fileInputRef"
              type="file"
              class="theme-backend-media-file-input"
              accept="image/*,video/mp4,video/webm"
              multiple
              @change="onFilesSelected"
            />
          </div>
          <span class="theme-meta">{{ mediaItems.length }} files</span>
        </div>

        <section v-if="isDropzoneOpen" :class="['theme-backend-upload-dropzone', { dragover: isDragOver }]">
          <button type="button" class="theme-backend-upload-close" aria-label="닫기" @click="isDropzoneOpen = false">×</button>
          <div
            class="theme-backend-upload-inner"
            @dragenter.prevent="isDragOver = true"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
          >
            <strong>{{ isUploading ? '업로드 중...' : '업로드할 파일 놓기' }}</strong>
            <span>또는</span>
            <button
              type="button"
              class="theme-form-submit theme-form-submit-secondary-soft"
              :disabled="isUploading"
              @click="triggerFileInput"
            >파일 선택</button>
            <p>최대 업로드 파일 크기: 256 MB.</p>
            <p v-if="uploadError" class="theme-form-status error">{{ uploadError }}</p>
          </div>
        </section>

        <section class="theme-backend-media-toolbar">
          <div class="theme-backend-media-filters">
            <select v-model="typeFilter" name="typeFilter">
              <option value="all">모든 미디어 항목</option>
              <option value="image">이미지</option>
              <option value="video">비디오</option>
            </select>
            <select v-model="dateFilter" name="dateFilter">
              <option value="all">모든 날짜</option>
              <option v-for="month in dateOptions" :key="month" :value="month">{{ month }}</option>
            </select>
          </div>

          <div class="theme-backend-media-search">
            <label for="mediaSearch">미디어 검색</label>
            <input id="mediaSearch" v-model.trim="query" type="search" placeholder="파일명 검색" />
          </div>
        </section>

        <div v-if="isLoading" class="theme-backend-state">미디어 불러오는 중...</div>

        <section v-else class="theme-backend-media-grid">
          <button
            v-for="media in filteredMedia"
            :key="media.id"
            type="button"
            class="theme-backend-media-card"
            @click="openDetail(media)"
          >
            <img :src="media.src" :alt="media.title" loading="lazy" />
            <div class="theme-backend-media-meta">
              <strong>{{ media.title }}</strong>
              <span>{{ media.filename }}</span>
            </div>
          </button>
        </section>
      </main>
    </div>

    <div v-if="activeMedia" class="theme-backend-user-modal" @click="closeDetail">
      <aside class="theme-backend-media-drawer" @click.stop>
        <header class="theme-backend-user-drawer-head">
          <strong>첨부파일 세부 사항</strong>
          <button type="button" class="theme-backend-close" aria-label="Close editor" @click="closeDetail">×</button>
        </header>

        <div class="theme-backend-media-drawer-body">
          <div class="theme-backend-media-preview">
            <img :src="activeMedia.src" :alt="activeMedia.title" />
          </div>

          <form class="theme-backend-form" @submit.prevent="saveMediaDetail">
            <label class="theme-form-field">
              <span>제목</span>
              <input v-model="activeMedia.title" maxlength="120" />
            </label>

            <label class="theme-form-field">
              <span>캡션</span>
              <textarea v-model="activeMedia.caption" rows="2"></textarea>
            </label>

            <label class="theme-form-field">
              <span>설명</span>
              <textarea v-model="activeMedia.description" rows="3"></textarea>
            </label>

            <label class="theme-form-field">
              <span>파일 URL</span>
              <input :value="activeMedia.src" readonly />
            </label>

            <div class="theme-backend-actions">
              <button
                type="button"
                class="theme-form-submit theme-form-submit-warning"
                :disabled="isSaving || isDeleting"
                @click="deleteMediaItem"
              >
                {{ isDeleting ? '삭제 중...' : '삭제' }}
              </button>
              <button type="submit" class="theme-form-submit" :disabled="isSaving || isDeleting">
                {{ isSaving ? '저장 중...' : '저장' }}
              </button>
            </div>
            <p v-if="saveMessage" :class="['theme-form-status', { error: saveIsError }]">{{ saveMessage }}</p>
          </form>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({
  layout: 'default',
})

type ApiMediaItem = {
  id: string
  title: string
  originalName: string
  mimeType: string
  paths: { original: string }
  caption: string
  description: string
  createdAt: string
}

type MediaItem = {
  id: string
  title: string
  filename: string
  type: 'image' | 'video'
  date: string
  src: string
  caption: string
  description: string
}

const { navItems } = useBackendMenu()

const apiBase = useApiBase()

// Upload paths like /uploads/... must be served by the API server.
// In production the browser reaches them via the same Apache origin (same-origin,
// no prefix needed).  In development apiBase is http://localhost:9000 so we
// extract only the origin (host+port) as the prefix.
function toAbsUrl(p: string) {
  if (!p) return ''
  if (!p.startsWith('/')) return p
  try {
    // Works when apiBase is a full URL (dev); no-ops when it's /api (production).
    const { origin } = new URL(apiBase)
    return origin !== 'null' ? `${origin}${p}` : p
  } catch {
    return p
  }
}

function fromApiItem(item: ApiMediaItem): MediaItem {
  return {
    id: item.id,
    title: item.title,
    filename: item.originalName,
    type: item.mimeType?.startsWith('video/') ? 'video' : 'image',
    date: item.createdAt?.slice(0, 7) || '',
    src: toAbsUrl(item.paths?.original || ''),
    caption: item.caption || '',
    description: item.description || '',
  }
}

const isSidebarOpen = ref(false)
const query = ref('')
const typeFilter = ref<'all' | 'image' | 'video'>('all')
const dateFilter = ref('all')
const activeMedia = ref<MediaItem | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDropzoneOpen = ref(false)
const isDragOver = ref(false)
const saveMessage = ref('')
const saveIsError = ref(false)
const isUploading = ref(false)
const uploadError = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)

const { data: mediaData, pending: isLoading } = await useFetch<{ items: ApiMediaItem[] }>(
  `${apiBase}/api/admin/media`,
  {
    credentials: 'include',
    server: false,
    default: () => ({ items: [] }),
  },
)

const mediaItems = ref<MediaItem[]>([])
watch(
  () => mediaData.value?.items,
  (items) => {
    if (items) mediaItems.value = items.map(fromApiItem)
  },
  { immediate: true },
)

const dateOptions = computed(() => {
  const months = new Set(mediaItems.value.map(m => m.date).filter(Boolean))
  return Array.from(months).sort().reverse()
})

const filteredMedia = computed(() =>
  mediaItems.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.type !== typeFilter.value) return false
    if (dateFilter.value !== 'all' && item.date !== dateFilter.value) return false
    if (!query.value) return true
    const q = query.value.toLowerCase()
    return item.title.toLowerCase().includes(q) || item.filename.toLowerCase().includes(q)
  }),
)

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function uploadFiles(files: File[]) {
  if (!files.length || isUploading.value) return
  isUploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    const result = await $fetch<{ items: ApiMediaItem[] }>(
      `${apiBase}/api/admin/media/upload`,
      { method: 'POST', credentials: 'include', body: formData },
    )
    mediaItems.value.unshift(...result.items.map(fromApiItem))
    isDropzoneOpen.value = false
  } catch (err: unknown) {
    uploadError.value = err instanceof Error ? err.message : '업로드 실패'
  } finally {
    isUploading.value = false
  }
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadFiles(Array.from(input.files))
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length) uploadFiles(files)
}

function toggleDropzone() {
  isDropzoneOpen.value = !isDropzoneOpen.value
  uploadError.value = ''
}

function openDetail(item: MediaItem) {
  activeMedia.value = { ...item }
}

function closeDetail() {
  activeMedia.value = null
  saveMessage.value = ''
}

async function deleteMediaItem() {
  if (!activeMedia.value || isDeleting.value || isSaving.value) return
  if (!window.confirm(`'${activeMedia.value.title || activeMedia.value.filename}' 항목을 삭제할까요?`)) return

  const targetId = activeMedia.value.id
  isDeleting.value = true
  saveMessage.value = ''
  saveIsError.value = false

  try {
    await $fetch(`${apiBase}/api/admin/media/${targetId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    mediaItems.value = mediaItems.value.filter(m => m.id !== targetId)
    closeDetail()
  } catch {
    saveIsError.value = true
    saveMessage.value = '삭제 실패'
  } finally {
    isDeleting.value = false
  }
}

async function saveMediaDetail() {
  if (!activeMedia.value || isSaving.value) return
  isSaving.value = true
  saveMessage.value = ''
  saveIsError.value = false

  try {
    const result = await $fetch<{ item: ApiMediaItem }>(
      `${apiBase}/api/admin/media/${activeMedia.value.id}`,
      {
        method: 'PUT',
        credentials: 'include',
        body: {
          title: activeMedia.value.title,
          caption: activeMedia.value.caption,
          description: activeMedia.value.description,
        },
      },
    )
    const updated = fromApiItem(result.item)
    const index = mediaItems.value.findIndex(m => m.id === updated.id)
    if (index >= 0) Object.assign(mediaItems.value[index], updated)
    activeMedia.value = { ...updated }
    saveMessage.value = '저장되었습니다.'
    setTimeout(() => { saveMessage.value = '' }, 1800)
  } catch {
    saveIsError.value = true
    saveMessage.value = '저장 실패'
  } finally {
    isSaving.value = false
  }
}
</script>
