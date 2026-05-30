<template>
  <div :class="['block-imagegrid', `block-imagegrid-cols-${columns}`, `block-imagegrid-gap-${gap}`]">
    <figure
      v-for="(cell, i) in cells"
      :key="i"
      class="block-imagegrid-cell"
    >
      <img :src="cell.url" :alt="cell.alt" loading="lazy" />
      <figcaption v-if="cell.caption">{{ cell.caption }}</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type Item = { imageId?: string; caption?: string }

const props = defineProps<{
  block: { props: { columns?: string; gap?: string; items?: Item[] } }
  mediaMap?: Record<string, MediaInfo>
}>()

const columns = computed(() => {
  const c = props.block.props?.columns
  return ['2', '3', '4'].includes(c || '') ? c : '3'
})
const gap = computed(() => {
  const g = props.block.props?.gap
  return ['small', 'medium', 'large'].includes(g || '') ? g : 'medium'
})

const cells = computed(() => {
  const items = props.block.props?.items || []
  const mm = props.mediaMap || {}
  return items.map(it => {
    const m = mm[it.imageId || '']
    return {
      url: m?.paths?.original || '',
      alt: m?.alt || m?.title || '',
      caption: it.caption || '',
    }
  }).filter(c => c.url)
})
</script>
