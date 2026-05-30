<template>
  <div ref="rootRef" class="category-select">
    <button
      type="button"
      :class="['category-select-trigger', { open: isOpen }]"
      @click="togglePanel"
    >
      <span v-if="!selectedOptions.length" class="category-select-placeholder">{{ placeholder }}</span>
      <span v-else class="category-select-chips">
        <span v-for="opt in selectedOptions" :key="opt.id" class="category-select-chip">
          {{ opt.name }}
          <span
            class="category-select-chip-x"
            role="button"
            tabindex="-1"
            aria-label="제거"
            @click.stop="toggleOption(opt.id)"
          >×</span>
        </span>
      </span>
      <span class="category-select-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="isOpen" class="category-select-panel" role="listbox">
      <p v-if="!options.length" class="category-select-empty">{{ emptyText }}</p>
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        :class="['category-select-option', { selected: isSelected(opt.id) }]"
        role="option"
        :aria-selected="isSelected(opt.id)"
        @click="toggleOption(opt.id)"
      >
        <span class="category-select-check" aria-hidden="true">
          <span v-if="isSelected(opt.id)">✓</span>
        </span>
        <span class="category-select-option-label" :style="{ paddingLeft: `${opt.depth * 14}px` }">
          <span v-if="opt.depth > 0" class="category-select-branch">└</span>
          {{ opt.name }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Option = { id: string; name: string; depth: number }

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: Option[]
  placeholder?: string
  emptyText?: string
}>(), {
  placeholder: '선택 (없음)',
  emptyText: '항목이 없습니다.',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const selectedOptions = computed(() =>
  // Preserve `options` order so chips read in the same order as the panel,
  // not in selection order (which would feel arbitrary as users toggle).
  props.options.filter(o => props.modelValue.includes(o.id)),
)

function isSelected(id: string) {
  return props.modelValue.includes(id)
}

function toggleOption(id: string) {
  const next = isSelected(id)
    ? props.modelValue.filter(v => v !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}

function togglePanel() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function onDocMouseDown(e: MouseEvent) {
  if (!isOpen.value) return
  if (!rootRef.value) return
  if (rootRef.value.contains(e.target as Node)) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>
