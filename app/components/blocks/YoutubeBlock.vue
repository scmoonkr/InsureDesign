<template>
  <div v-if="videoId" class="block-youtube">
    <iframe
      :src="src"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
  <div v-else class="block-youtube block-youtube-invalid">
    <em>유효하지 않은 YouTube URL: {{ raw }}</em>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: { props: { content?: string } }
}>()

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

const raw = computed(() => props.block.props?.content || '')
const videoId = computed(() => {
  const s = raw.value.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m = s.match(YT_RE)
  return m ? m[1] : ''
})
const src = computed(() => `https://www.youtube-nocookie.com/embed/${videoId.value}`)
</script>
