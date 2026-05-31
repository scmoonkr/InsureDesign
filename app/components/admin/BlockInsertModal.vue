<template>
  <div class="theme-backend-user-modal" @click="$emit('close')">
    <MediaPicker
      v-if="pickerForField"
      :open="!!pickerForField"
      @close="pickerForField = ''"
      @pick="onPickerPick"
    />

    <div class="theme-backend-block-insert" @click.stop>
      <header class="theme-backend-user-drawer-head">
        <strong>{{ spec.label }} block 삽입</strong>
        <button type="button" class="theme-backend-close" aria-label="Close" @click="$emit('close')">×</button>
      </header>

      <form class="theme-backend-form" @submit.prevent="confirm">
        <div class="theme-backend-form-grid">
          <!-- Options -->
          <label v-for="opt in optionEntries" :key="opt.key" class="theme-form-field">
            <span>
              {{ opt.label }}
              <em v-if="opt.def.required" style="color:#EF4444;font-style:normal">*</em>
            </span>

            <!-- enum → select -->
            <select v-if="opt.def.type === 'enum'" v-model="form[opt.key]">
              <option v-if="!opt.def.required && !opt.def.default" value="">— 없음 —</option>
              <option v-for="v in opt.def.values" :key="v" :value="v">{{ v }}</option>
            </select>

            <!-- number → number input -->
            <input
              v-else-if="opt.def.type === 'number'"
              v-model="form[opt.key]"
              type="number"
              :min="opt.def.min"
              :max="opt.def.max"
              step="any"
            />

            <!-- color → color picker -->
            <div v-else-if="opt.def.type === 'color'" class="block-insert-color">
              <input v-model="form[opt.key]" type="color" />
              <input v-model="form[opt.key]" type="text" placeholder="#aabbcc" maxlength="7" />
              <button
                v-if="form[opt.key]"
                type="button"
                class="theme-backend-link"
                @click="form[opt.key] = ''"
              >제거</button>
            </div>

            <!-- imageId → picker button + preview -->
            <div v-else-if="opt.def.type === 'imageId'" class="block-insert-image">
              <div v-if="form[opt.key]" class="block-insert-image-preview">
                <code>{{ form[opt.key] }}</code>
                <button
                  type="button"
                  class="theme-backend-link theme-backend-link-danger"
                  @click="form[opt.key] = ''"
                >제거</button>
              </div>
              <button
                type="button"
                class="theme-form-submit theme-form-submit-secondary-soft"
                @click="pickerForField = opt.key"
              >{{ form[opt.key] ? '변경' : '이미지 선택' }}</button>
            </div>

            <!-- string (default) → text input -->
            <input v-else v-model="form[opt.key]" type="text" :placeholder="opt.placeholder" />
          </label>

          <!-- Content body -->
          <label v-if="spec.requiresContent || spec.allowsContent" class="theme-form-field" style="grid-column: 1 / -1">
            <span>
              {{ contentLabel }}
              <em v-if="spec.requiresContent" style="color:#EF4444;font-style:normal">*</em>
            </span>
            <textarea v-model="form.content" rows="4" :placeholder="contentPlaceholder"></textarea>
          </label>
        </div>

        <p v-if="errorMessage" class="theme-form-status error">{{ errorMessage }}</p>

        <div class="theme-backend-actions" style="justify-content: flex-end">
          <button
            type="button"
            class="theme-form-submit theme-form-submit-secondary-soft"
            @click="$emit('close')"
          >취소</button>
          <button type="submit" class="theme-form-submit">삽입</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BLOCK_TYPES } from '~~/shared/blocks/registry.js'
import MediaPicker from '~/components/admin/MediaPicker.vue'

type OptionDef = {
  type?: 'enum' | 'number' | 'string'
  values?: string[]
  required?: boolean
  default?: unknown
  min?: number
  max?: number
}
type Spec = {
  label: string
  requiresContent: boolean
  allowsContent?: boolean
  options: Record<string, OptionDef>
}

const props = defineProps<{ type: string }>()
const emit = defineEmits<{
  close: []
  insert: [snippet: string]
}>()

const spec = computed<Spec>(() => (BLOCK_TYPES as Record<string, Spec>)[props.type])

const PLACEHOLDERS: Record<string, Record<string, string>> = {
  button: { text: '버튼 이름', url: '/target 또는 https://...' },
  quote: { cite: '출처/저자' },
  file: { name: '표시 이름 (선택)' },
  map: { title: '위치 이름 (선택)' },
  title: {
    title: '제목 (필수)',
    subtitle: '한 줄짜리 부제목 (선택)',
    buttonText: 'CTA 버튼 텍스트 (예: 자세히 보기) — 비우면 버튼 없음',
    buttonUrl: '/target 또는 https://...',
  },
  image: {
    caption: '이미지 아래 설명 (선택)',
    link: '클릭 시 이동할 URL (선택)',
  },
}

const CONTENT_PLACEHOLDERS: Record<string, string> = {
  notice: '공지 내용을 입력하세요',
  highlight: '강조할 내용',
  quote: '인용문',
  youtube: 'https://www.youtube.com/watch?v=VIDEO_ID',
  file: 'https://example.com/file.pdf  또는  /uploads/.../file.pdf',
  title: '설명 / 본문 텍스트 (여러 줄, 인라인 markdown 가능) — 선택',
}

// Per-block label override for the content textarea. Defaults to "본문".
const CONTENT_LABELS: Record<string, string> = {
  title: '설명',
}

const optionEntries = computed(() =>
  Object.entries(spec.value.options).map(([key, def]) => ({
    key,
    def,
    label: key,
    placeholder: PLACEHOLDERS[props.type]?.[key] || '',
  })),
)

const contentPlaceholder = computed(() => CONTENT_PLACEHOLDERS[props.type] || '')
const contentLabel = computed(() => CONTENT_LABELS[props.type] || '본문')

const form = reactive<Record<string, unknown>>({ content: '' })

// Seed defaults
for (const [key, def] of Object.entries(spec.value.options)) {
  form[key] = def.default !== undefined ? def.default : ''
}

const errorMessage = ref('')
const pickerForField = ref('')

function onPickerPick(ids: string[]) {
  if (pickerForField.value && ids[0]) {
    form[pickerForField.value] = ids[0]
  }
  pickerForField.value = ''
}

function confirm() {
  errorMessage.value = ''
  // Basic client-side guard before building the snippet
  for (const [key, def] of Object.entries(spec.value.options)) {
    if (def.required && (form[key] === '' || form[key] === undefined || form[key] === null)) {
      errorMessage.value = `'${key}' 옵션은 필수입니다.`
      return
    }
  }
  if (spec.value.requiresContent && !String(form.content || '').trim()) {
    errorMessage.value = '본문을 입력하세요.'
    return
  }

  const snippet = buildSnippet(props.type, spec.value, form)
  emit('insert', snippet)
}

function buildSnippet(type: string, sp: Spec, f: Record<string, unknown>): string {
  const optionLines: string[] = []
  for (const [key, def] of Object.entries(sp.options)) {
    const v = f[key]
    if (v === undefined || v === '' || v === null) continue
    // skip echoing default values to keep the snippet minimal
    if (def.default !== undefined && v === def.default) continue
    optionLines.push(`${key}: ${v}`)
  }
  const lines = [`:::${type}`, ...optionLines]
  const body = String(f.content || '').trim()
  // Emit body when required, or when allowed and the user actually typed something.
  if (sp.requiresContent || (sp.allowsContent && body)) {
    if (optionLines.length) lines.push('') // blank separator before body
    lines.push(body)
  }
  lines.push(':::')
  return lines.join('\n')
}
</script>
