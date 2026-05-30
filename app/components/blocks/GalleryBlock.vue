<template>
  <div class="block-gallery">
    <a
      v-for="(item, i) in items"
      :key="i"
      :href="item.url"
      target="_blank"
      rel="noopener"
      class="block-gallery-item"
    >
      <img :src="item.url" :alt="item.alt" loading="lazy" />
    </a>
  </div>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }

const props = defineProps<{
  block: { props: { imageIds?: string[] } }
  mediaMap?: Record<string, MediaInfo>
}>()

const items = computed(() => {
  const ids = props.block.props?.imageIds || []
  const mm = props.mediaMap || {}
  return ids.map(id => {
    const m = mm[id]
    return {
      url: m?.paths?.original || '',
      alt: m?.alt || m?.title || '',
    }
  }).filter(it => it.url)
})
</script>
