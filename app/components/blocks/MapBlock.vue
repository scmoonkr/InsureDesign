<template>
  <div v-if="isValid" class="block-map">
    <div v-if="title" class="block-map-title">{{ title }}</div>
    <iframe :src="src" loading="lazy"></iframe>
  </div>
  <div v-else class="block-map block-map-invalid">
    <em>잘못된 좌표</em>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: { props: { lat?: number | string; lng?: number | string; zoom?: number | string; title?: string } }
}>()

const lat = computed(() => Number(props.block.props?.lat))
const lng = computed(() => Number(props.block.props?.lng))
const zoom = computed(() => {
  const z = Number(props.block.props?.zoom)
  if (!Number.isFinite(z)) return 15
  return Math.max(1, Math.min(19, z))
})
const title = computed(() => props.block.props?.title || '')
const isValid = computed(() => Number.isFinite(lat.value) && Number.isFinite(lng.value))

const src = computed(() => {
  if (!isValid.value) return ''
  const half = 0.5 / Math.pow(2, zoom.value - 11)
  const bbox = [lng.value - half, lat.value - half, lng.value + half, lat.value + half]
    .map(n => n.toFixed(6))
    .join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.value.toFixed(6)},${lng.value.toFixed(6)}`
})
</script>
