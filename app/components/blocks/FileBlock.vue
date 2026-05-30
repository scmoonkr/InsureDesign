<template>
  <a
    :class="['block-file', { 'block-file-invalid': !isSafe }]"
    :href="isSafe ? url : '#'"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener' : undefined"
    :download="isSafe ? '' : undefined"
  >
    <span class="block-file-icon">{{ ext.toUpperCase() || 'FILE' }}</span>
    <span class="block-file-meta">
      <strong>{{ label }}</strong>
      <small v-if="filename && filename !== label">{{ filename }}</small>
    </span>
  </a>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: { props: { content?: string; name?: string } }
}>()

const url = computed(() => props.block.props?.content || '')

const isSafe = computed(() => {
  const u = url.value
  if (!u) return false
  if (u.startsWith('/')) return true
  return /^https?:/i.test(u)
})
const external = computed(() => /^https?:/i.test(url.value))

const filename = computed(() => {
  const u = url.value
  if (!u) return ''
  try {
    const parsed = u.startsWith('http') ? new URL(u) : new URL(u, 'http://x.local')
    return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '')
  } catch {
    return u.split('/').filter(Boolean).pop() || u
  }
})

const ext = computed(() => {
  const m = filename.value.match(/\.([a-z0-9]{1,5})(?:\?.*)?$/i)
  return m ? m[1].toLowerCase() : ''
})

const label = computed(() => props.block.props?.name || filename.value || '파일')
</script>
