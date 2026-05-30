<template>
  <a
    v-if="isSafe"
    :class="['block-button', `block-button-${style}`]"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener' : undefined"
  >{{ text }}</a>
  <span v-else class="block-button block-button-invalid">{{ text || '⚠ unsafe URL' }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: {
    props: { text?: string; url?: string; style?: string }
  }
}>()

const STYLES = ['primary', 'secondary', 'warning']

const text = computed(() => props.block.props?.text || '')
const href = computed(() => props.block.props?.url || '#')
const style = computed(() => {
  const s = props.block.props?.style
  return s && STYLES.includes(s) ? s : 'primary'
})
const isSafe = computed(() => {
  const u = href.value
  if (!u) return false
  if (u.startsWith('/') || u.startsWith('#')) return true
  return /^(https?|mailto|tel):/i.test(u)
})
const external = computed(() => /^https?:/i.test(href.value))
</script>
