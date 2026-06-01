<template>
  <div class="theme-backend-user-modal" @click="$emit('close')">
    <div class="theme-backend-media-picker" @click.stop>
      <header class="theme-backend-user-drawer-head">
        <strong>
          이미지 선택
          <span class="theme-meta" style="margin-left:8px">
            {{ multiple ? `${selected.length} / ${items.length}` : `${items.length}개` }}
          </span>
        </strong>
        <button type="button" class="theme-backend-close" aria-label="Close" @click="$emit('close')">×</button>
      </header>

      <div class="theme-backend-media-picker-toolbar">
        <input v-model.trim="query" type="search" placeholder="파일명 검색" />
        <span v-if="multiple" class="theme-meta">여러 개 선택 가능</span>
      </div>

      <div v-if="pending" class="theme-backend-state">Loading...</div>
      <div v-else-if="!filtered.length" class="theme-backend-state">이미지가 없습니다.</div>
      <section v-else class="theme-backend-media-picker-grid">
        <button
          v-for="m in filtered"
          :key="m.id"
          type="button"
          :class="['theme-backend-media-picker-cell', { selected: selected.includes(m.id) }]"
          @click="toggle(m.id)"
        >
          <img :src="m.paths.original" :alt="m.title || m.originalName" loading="lazy" />
          <div class="theme-backend-media-picker-meta">
            <strong>{{ m.title || m.originalName }}</strong>
          </div>
          <span v-if="selected.includes(m.id)" class="theme-backend-media-picker-check">✓</span>
        </button>
      </section>

      <footer class="theme-backend-media-picker-foot">
        <span v-if="multiple" class="theme-meta">{{ selected.length }}개 선택됨</span>
        <button type="button" class="theme-form-submit theme-form-submit-secondary-soft" @click="$emit('close')">취소</button>
        <button
          type="button"
          class="theme-form-submit"
          :disabled="!selected.length"
          @click="confirm"
        >선택 완료</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
type MediaItem = {
  id: string
  title?: string
  originalName: string
  mimeType: string
  paths: { original: string }
}

const props = defineProps<{
  open: boolean
  multiple?: boolean
}>()

const emit = defineEmits<{
  close: []
  pick: [ids: string[]]
}>()

const apiBase = useApiBase()

const query = ref('')
const selected = ref<string[]>([])

const { data, pending } = useFetch<{ items: MediaItem[] }>(
  `${apiBase}/api/admin/media`,
  {
    key: 'media-picker',
    credentials: 'include',
    server: false,
    default: () => ({ items: [] }),
  },
)

const items = computed<MediaItem[]>(() => (data.value?.items ?? []).filter(m => m.mimeType?.startsWith('image/')))

const filtered = computed(() => {
  if (!query.value) return items.value
  const q = query.value.toLowerCase()
  return items.value.filter(m =>
    (m.title || '').toLowerCase().includes(q) || m.originalName.toLowerCase().includes(q),
  )
})

watch(() => props.open, (o) => {
  if (o) selected.value = []
})

function toggle(id: string) {
  if (props.multiple) {
    const i = selected.value.indexOf(id)
    if (i >= 0) selected.value.splice(i, 1)
    else selected.value.push(id)
  } else {
    selected.value = [id]
  }
}

function confirm() {
  if (!selected.value.length) return
  emit('pick', [...selected.value])
}
</script>
