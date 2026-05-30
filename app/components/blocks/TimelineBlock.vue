<template>
  <div class="block-timeline">
    <article
      v-for="(item, i) in items"
      :key="i"
      class="block-timeline-item"
    >
      <div v-if="item.date" class="block-timeline-date">{{ item.date }}</div>
      <div class="block-timeline-marker">
        <span class="block-timeline-dot"></span>
      </div>
      <div class="block-timeline-content">
        <h3 v-if="item.title" class="block-timeline-title">{{ item.title }}</h3>
        <figure v-if="item.imageUrl" class="block-timeline-image">
          <img :src="item.imageUrl" :alt="item.imageAlt" loading="lazy" />
        </figure>
        <p v-if="item.description" class="block-timeline-desc">{{ item.description }}</p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type RawItem = {
  date?: string
  title?: string
  description?: string
  imageId?: string
}

const props = defineProps<{
  block: { props: { items?: RawItem[] } }
  mediaMap?: Record<string, MediaInfo>
}>()

const items = computed(() => {
  const list = props.block.props?.items || []
  const mm = props.mediaMap || {}
  return list
    .filter(it => it && typeof it === 'object')
    .map(it => {
      let imageUrl = ''
      let imageAlt = ''
      if (it.imageId) {
        const m = mm[it.imageId]
        imageUrl = m?.paths?.original || ''
        imageAlt = m?.alt || m?.title || ''
      }
      return {
        date: it.date || '',
        title: it.title || '',
        description: it.description || '',
        imageUrl,
        imageAlt,
      }
    })
    .filter(it => it.date || it.title || it.description || it.imageUrl)
})
</script>
